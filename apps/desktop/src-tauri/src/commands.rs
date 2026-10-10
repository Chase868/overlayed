use std::{
  ops::Deref,
  sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
  },
  time::Duration,
};

use tauri::{
  image::Image, menu::Menu, AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, State,
  WebviewWindow, Wry,
};

use crate::{
  constants::*, DiscordReauthNeeded, HideTaskbarWhenPinned, MinimizeToTray,
  NotificationGeneration, Pinned, TrayMenu,
};

#[tauri::command]
pub fn set_discord_reauth_needed(
  app: AppHandle,
  needed: bool,
  status: State<DiscordReauthNeeded>,
  menu: State<TrayMenu>,
) {
  status.0.store(needed, Ordering::Relaxed);

  let (menu_text, tooltip) = if needed {
    (
      "Reauthorize Discord notifications",
      "Overlayed - Discord authorization required",
    )
  } else {
    ("Discord notifications: connected", "Overlayed")
  };

  if let Ok(menu) = menu.lock() {
    if let Some(item) = menu.get(TRAY_DISCORD_STATUS) {
      let _ = item.as_menuitem_unchecked().set_text(menu_text);
    }
  }

  if let Some(tray) = app.tray_by_id(OVERLAYED) {
    let _ = tray.set_tooltip(Some(tooltip));
  }
}

#[tauri::command]
pub fn show_discord_notification(
  app: AppHandle,
  generation: State<NotificationGeneration>,
  payload: serde_json::Value,
  x: f64,
  y: f64,
) {
  let Some(notification_window) = app.get_webview_window(NOTIFICATION_WINDOW_NAME) else {
    return;
  };

  let Some(main_window) = app.get_webview_window(MAIN_WINDOW_NAME) else {
    return;
  };

  let Ok(main_position) = main_window.outer_position() else {
    return;
  };
  let scale_factor = main_window.scale_factor().unwrap_or(1.0);
  let position = PhysicalPosition::new(
    main_position.x + (x * scale_factor).round() as i32,
    main_position.y + (y * scale_factor).round() as i32,
  );

  let _ = notification_window.set_size(LogicalSize::new(360.0, 112.0));
  let _ = notification_window.set_position(position);
  let _ = notification_window.set_ignore_cursor_events(true);
  let _ = notification_window.set_always_on_top(true);
  let _ = notification_window.emit(DISPLAY_DISCORD_NOTIFICATION, payload);
  let _ = notification_window.show();

  let current_generation = generation.0.fetch_add(1, Ordering::Relaxed) + 1;
  let timeout_window = notification_window.clone();
  let timeout_generation = app.state::<NotificationGeneration>().inner().0.clone();

  tauri::async_runtime::spawn(async move {
    tokio::time::sleep(Duration::from_millis(3200)).await;
    if timeout_generation.load(Ordering::Relaxed) == current_generation {
      let _ = timeout_window.hide();
      let _ = timeout_window.set_always_on_top(false);
    }
  });
}

#[tauri::command]
pub fn open_settings(window: WebviewWindow, update: bool) {
  let app = window.app_handle();
  let settings_windows = app.get_webview_window(SETTINGS_WINDOW_NAME);
  if let Some(settings_windows) = settings_windows {
    settings_windows.show();
    settings_windows.set_focus();
    if update {
      // emit to the settings window to show update
      settings_windows
        .emit_to(SETTINGS_WINDOW_NAME, SHOW_UPDATE_MODAL, ())
        .unwrap();
    }
  }
}

#[tauri::command]
pub fn close_settings(window: WebviewWindow) {
  let app = window.app_handle();
  let settings_windows = app.get_webview_window(SETTINGS_WINDOW_NAME);
  if let Some(settings_windows) = settings_windows {
    settings_windows.hide();
  }
}

#[tauri::command]
pub fn maximize_overlay(window: WebviewWindow) {
  if let Some(main_window) = window.app_handle().get_webview_window(MAIN_WINDOW_NAME) {
    let _ = main_window.maximize();
  }
}

#[tauri::command]
pub fn get_pin(storage: State<Pinned>) -> bool {
  storage.0.load(std::sync::atomic::Ordering::Relaxed)
}

#[tauri::command]
pub fn open_devtools(window: WebviewWindow) {
  window.open_devtools();
}

#[tauri::command]
pub fn open_overlay_devtools(window: WebviewWindow) {
  let app = window.app_handle();
  if let Some(main_window) = app.get_webview_window(MAIN_WINDOW_NAME) {
    main_window.open_devtools();
  }
}

#[tauri::command]
pub fn simulate_error_screen(window: WebviewWindow) {
  let app = window.app_handle();

  if let Some(main_window) = app.get_webview_window(MAIN_WINDOW_NAME) {
    let _ = main_window.eval("window.location.hash = '#/error';");
    let _ = main_window.show();
    let _ = main_window.set_focus();
  }

  if let Some(settings_window) = app.get_webview_window(SETTINGS_WINDOW_NAME) {
    let _ = settings_window.hide();
  }
}

#[tauri::command]
pub fn toggle_pin(
  window: WebviewWindow,
  pin: State<Pinned>,
  menu: State<TrayMenu>,
  hide_taskbar: State<HideTaskbarWhenPinned>,
) {
  let app = window.app_handle();
  let value = !get_pin(app.state::<Pinned>());

  // Always target the main overlay window so pinning from other windows
  // (e.g., settings) does not affect those windows.
  if let Some(main_win) = app.get_webview_window(MAIN_WINDOW_NAME) {
    _set_pin(value, &main_win, pin, menu, hide_taskbar);
  }
}

#[tauri::command]
pub fn set_pin(
  window: WebviewWindow,
  pin: State<Pinned>,
  menu: State<TrayMenu>,
  hide_taskbar: State<HideTaskbarWhenPinned>,
  value: bool,
) {
  if let Some(main_win) = window.app_handle().get_webview_window(MAIN_WINDOW_NAME) {
    _set_pin(value, &main_win, pin, menu, hide_taskbar);
  }
}

impl Deref for Pinned {
  type Target = AtomicBool;

  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

impl Deref for TrayMenu {
  type Target = Mutex<Menu<Wry>>;

  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

impl Deref for HideTaskbarWhenPinned {
  type Target = AtomicBool;

  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

impl Deref for MinimizeToTray {
  type Target = AtomicBool;

  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

fn apply_taskbar_visibility(app: &AppHandle, pinned: bool, hide_taskbar_when_pinned: bool) {
  let skip_taskbar = pinned && hide_taskbar_when_pinned;

  if let Some(main_window) = app.get_webview_window(MAIN_WINDOW_NAME) {
    #[cfg(target_os = "windows")]
    main_window.set_skip_taskbar(skip_taskbar).ok();
  }

  #[cfg(target_os = "macos")]
  {
    use tauri::ActivationPolicy;
    app
      .set_activation_policy(if skip_taskbar {
        ActivationPolicy::Accessory
      } else {
        ActivationPolicy::Regular
      })
      .ok();
  }
}

fn _set_pin(
  value: bool,
  window: &WebviewWindow,
  pinned: State<Pinned>,
  menu: State<TrayMenu>,
  hide_taskbar: State<HideTaskbarWhenPinned>,
) {
  // @d0nutptr cooked here
  pinned.store(value, std::sync::atomic::Ordering::Relaxed);

  // emit to the main window and also broadcast to all webviews so other
  // windows (like settings) can react to the change.
  window.emit(TRAY_TOGGLE_PIN, value).unwrap();

  // Broadcast the pin change to all webviews so other
  // windows (like settings) can react to the change.
  let app_handle = window.app_handle();
  if let Some(main_win) = app_handle.get_webview_window(MAIN_WINDOW_NAME) {
    let _ = main_win.emit(TRAY_TOGGLE_PIN, value);
  }
  if let Some(settings_win) = app_handle.get_webview_window(SETTINGS_WINDOW_NAME) {
    let _ = settings_win.emit(TRAY_TOGGLE_PIN, value);
  }

  // invert the label for the tray
  if let Some(toggle_pin_menu_item) = menu.lock().ok().and_then(|m| m.get(TRAY_TOGGLE_PIN)) {
    let enable_or_disable = if value { "Unpin" } else { "Pin" };
    toggle_pin_menu_item
      .as_menuitem_unchecked()
      .set_text(enable_or_disable);
  }

  #[cfg(target_os = "macos")]
  window.with_webview(move |webview| unsafe {
    #[cfg(target_os = "macos")]
    use cocoa::appkit::NSWindow;
    let id = webview.ns_window() as cocoa::base::id;

    #[cfg(target_arch = "aarch64")]
    id.setIgnoresMouseEvents_(value);

    // convert bool into number
    #[cfg(target_arch = "x86_64")]
    {
      let value = if value { 1 } else { 0 };
      id.setHasShadow_(value);
    }
  });

  window.set_ignore_cursor_events(value);
  #[cfg(not(target_os = "macos"))]
  window.set_always_on_top(value).ok();

  if !value {
    let _ = window.maximize();
  }

  apply_taskbar_visibility(
    &window.app_handle(),
    value,
    hide_taskbar.load(std::sync::atomic::Ordering::Relaxed),
  );

  // update the tray icon
  update_tray_icon(window.app_handle(), value);
}

pub fn update_tray_icon(app: &AppHandle, pinned: bool) {
  let icon_bytes = if pinned {
    include_bytes!("../icons/tray/icon-pinned.ico").as_slice()
  } else {
    include_bytes!("../icons/tray/icon.ico").as_slice()
  };

  if let Some(tray) = app.tray_by_id(OVERLAYED) {
    if let Ok(icon) = Image::from_bytes(icon_bytes) {
      tray.set_icon(Some(icon));
    }
  }
}

#[tauri::command]
pub fn set_hide_taskbar_when_pinned(
  window: WebviewWindow,
  hide_taskbar_when_pinned: bool,
  pinned: State<Pinned>,
  hide_taskbar: State<HideTaskbarWhenPinned>,
) {
  hide_taskbar.store(
    hide_taskbar_when_pinned,
    std::sync::atomic::Ordering::Relaxed,
  );

  apply_taskbar_visibility(
    &window.app_handle(),
    pinned.load(std::sync::atomic::Ordering::Relaxed),
    hide_taskbar_when_pinned,
  );
}

#[tauri::command]
pub fn set_minimize_to_tray(
  minimize_to_tray: bool,
  state: State<MinimizeToTray>,
) {
  state.store(minimize_to_tray, std::sync::atomic::Ordering::Relaxed);
}

#[tauri::command]
pub fn set_overlay_click_through(
  window: WebviewWindow,
  enabled: bool,
  pinned: State<Pinned>,
) {
  if let Some(main_win) = window.app_handle().get_webview_window(MAIN_WINDOW_NAME) {
    // Only allow click-through while pinned; unpinned should always be interactive.
    let should_ignore_cursor_events = enabled && pinned.load(std::sync::atomic::Ordering::Relaxed);
    let _ = main_win.set_ignore_cursor_events(should_ignore_cursor_events);
  }
}

#[tauri::command]
pub fn open_config_dir(app: tauri::AppHandle) {
  use tauri::Manager;
  use tauri_plugin_opener::OpenerExt;
  if let Ok(path) = app.path().app_config_dir() {
    let _ = std::fs::create_dir_all(&path);
    let _ = app
      .opener()
      .open_path(path.to_string_lossy().to_string(), None::<&str>);
  }
}
