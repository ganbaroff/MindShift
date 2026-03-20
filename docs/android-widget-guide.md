# Android Home Screen Widget — Implementation Guide

MindShift is a Capacitor hybrid app. Android home screen widgets require native Android code (XML layouts, Kotlin/Java providers) that runs outside the WebView. This guide covers how to add a widget after running `npx cap add android`.

## Why a Widget Matters

Google Play featuring criteria reward apps that integrate deeply with Android. A home screen widget shows:
- At-a-glance info (current NOW task, focus minutes today)
- Quick actions (start a focus session with one tap)
- Platform investment beyond a WebView wrapper

## Prerequisites

```bash
# 1. Add Android platform (if not already done)
npx cap add android

# 2. Build and sync web assets
npm run build && npx cap sync

# 3. Open in Android Studio
npx cap open android
```

## Architecture Overview

```
Capacitor WebView (your React app)
       |
       | writes to SharedPreferences on state change
       |
SharedPreferences ("mindshift_widget_data")
       |
       | AppWidgetProvider reads on update
       |
Android Widget (native XML layout)
```

The widget cannot access the WebView directly. Data flows through `SharedPreferences` as a bridge:
1. The web app writes widget-relevant data (current task, focus minutes) to SharedPreferences via a Capacitor plugin
2. The widget provider reads SharedPreferences and updates the widget UI
3. Widget tap intents deep-link back into the Capacitor app

## Step 1: Widget Layout XML

Create `android/app/src/main/res/layout/widget_mindshift.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="12dp"
    android:background="@drawable/widget_background"
    android:gravity="center_horizontal">

    <!-- Header -->
    <TextView
        android:id="@+id/widget_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="MindShift"
        android:textColor="#E8E8F0"
        android:textSize="14sp"
        android:textStyle="bold"
        android:layout_marginBottom="8dp" />

    <!-- Current NOW task -->
    <TextView
        android:id="@+id/widget_now_task"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="No tasks right now"
        android:textColor="#E8E8F0"
        android:textSize="16sp"
        android:maxLines="2"
        android:ellipsize="end"
        android:layout_marginBottom="4dp" />

    <!-- Focus minutes today -->
    <TextView
        android:id="@+id/widget_focus_minutes"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="0 min focused today"
        android:textColor="#8B8BA7"
        android:textSize="12sp"
        android:layout_marginBottom="8dp" />

    <!-- Quick start button -->
    <Button
        android:id="@+id/widget_start_button"
        android:layout_width="match_parent"
        android:layout_height="40dp"
        android:text="Start Focus"
        android:textColor="#FFFFFF"
        android:textSize="14sp"
        android:backgroundTint="#7B72FF" />

</LinearLayout>
```

## Step 2: Widget Background Drawable

Create `android/app/src/main/res/drawable/widget_background.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#1E2136" />
    <corners android:radius="16dp" />
</shape>
```

## Step 3: Widget Info XML

Create `android/app/src/main/res/xml/widget_info.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_mindshift"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:previewImage="@drawable/widget_preview"
    android:description="@string/widget_description" />
```

Notes:
- `updatePeriodMillis="1800000"` = update every 30 minutes (minimum recommended)
- `targetCellWidth/Height` = Android 12+ sizing (3x2 cells)
- `minWidth/minHeight` = pre-Android 12 fallback

## Step 4: Widget Provider (Kotlin)

Create `android/app/src/main/java/com/mindshift/app/MindShiftWidgetProvider.kt`:

```kotlin
package com.mindshift.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.app.PendingIntent
import android.net.Uri

class MindShiftWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        private const val PREFS_NAME = "mindshift_widget_data"

        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val nowTask = prefs.getString("now_task_title", "No tasks right now") ?: "No tasks right now"
            val focusMinutes = prefs.getInt("focus_minutes_today", 0)

            val views = RemoteViews(context.packageName, R.layout.widget_mindshift)

            // Set data
            views.setTextViewText(R.id.widget_now_task, nowTask)
            views.setTextViewText(
                R.id.widget_focus_minutes,
                "$focusMinutes min focused today"
            )

            // Tap on task text -> open app to tasks page
            val taskIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://localhost/tasks"))
            taskIntent.setPackage(context.packageName)
            val taskPending = PendingIntent.getActivity(
                context, 0, taskIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_now_task, taskPending)

            // Tap "Start Focus" -> open app to focus page with quick=1
            val focusIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://localhost/focus?quick=1"))
            focusIntent.setPackage(context.packageName)
            val focusPending = PendingIntent.getActivity(
                context, 1, focusIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_start_button, focusPending)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
```

## Step 5: Register in AndroidManifest.xml

Add inside the `<application>` tag in `android/app/src/main/AndroidManifest.xml`:

```xml
<receiver
    android:name=".MindShiftWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_info" />
</receiver>
```

## Step 6: String Resources

Add to `android/app/src/main/res/values/strings.xml`:

```xml
<string name="widget_description">See your current task and focus progress at a glance</string>
```

## Step 7: Capacitor Plugin for SharedPreferences Bridge

The web app needs to push data to SharedPreferences so the widget can read it. Create a local Capacitor plugin.

### Plugin Definition (Kotlin)

Create `android/app/src/main/java/com/mindshift/app/WidgetBridgePlugin.kt`:

```kotlin
package com.mindshift.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {

    @PluginMethod
    fun updateWidgetData(call: PluginCall) {
        val nowTaskTitle = call.getString("nowTaskTitle", "No tasks right now")
        val focusMinutesToday = call.getInt("focusMinutesToday", 0) ?: 0

        val context = activity.applicationContext
        val prefs = context.getSharedPreferences("mindshift_widget_data", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("now_task_title", nowTaskTitle)
            .putInt("focus_minutes_today", focusMinutesToday)
            .apply()

        // Trigger widget refresh
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val widgetComponent = ComponentName(context, MindShiftWidgetProvider::class.java)
        val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
        for (id in widgetIds) {
            MindShiftWidgetProvider.updateWidget(context, appWidgetManager, id)
        }

        call.resolve()
    }
}
```

### Register Plugin in MainActivity

In `android/app/src/main/java/com/mindshift/app/MainActivity.kt`, add:

```kotlin
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        registerPlugin(WidgetBridgePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
```

### Web-Side Bridge (TypeScript)

Add to `src/shared/lib/native.ts`:

```typescript
/** Update Android home screen widget data via SharedPreferences bridge */
export const updateWidgetData = (data: {
  nowTaskTitle: string
  focusMinutesToday: number
}): void => {
  if (!isNativeApp()) return
  try {
    const Capacitor = (window as any).Capacitor
    if (Capacitor?.Plugins?.WidgetBridge) {
      void Capacitor.Plugins.WidgetBridge.updateWidgetData(data)
    }
  } catch {
    // Widget bridge not available — ignore silently
  }
}
```

### When to Call updateWidgetData

Call from the store or hooks when relevant data changes:
- `completeTask()` — update NOW task title
- `addTask()` to NOW pool — update NOW task title
- `useFocusSession` on session end — update focus minutes
- App foreground resume — refresh both values

Example integration point in the store:

```typescript
// Inside completeTask() or wherever NOW pool changes:
import { updateWidgetData } from '@/shared/lib/native'

// After pool state update:
const nowTasks = get().nowPool.filter(t => t.status === 'active')
updateWidgetData({
  nowTaskTitle: nowTasks[0]?.title ?? 'No tasks right now',
  focusMinutesToday: getTodayFocusMinutes() // compute from weeklyStats
})
```

## Step 8: Widget Preview Image

Create a 570x310px preview image showing the widget with sample data. Save as:
- `android/app/src/main/res/drawable-nodpi/widget_preview.png`

Use MindShift's dark surface colors (#1E2136 background, #E8E8F0 text, #7B72FF button).

## Deep Link Configuration

The widget buttons use deep links (`https://localhost/focus?quick=1`). Capacitor's `androidScheme: 'https'` in `capacitor.config.ts` already handles this. The app's router will pick up the path and query params.

## App Shortcuts (Already Configured)

MindShift's PWA manifest (`public/manifest.json`) already defines 4 shortcuts:

| Shortcut | URL | Description |
|----------|-----|-------------|
| Start Focus | `/focus` | Open focus session setup |
| Quick Start (5 min) | `/focus?quick=1` | Immediate 5-minute session |
| My Tasks | `/tasks` | Task management |
| My Progress | `/progress` | Stats and achievements |

Capacitor syncs these from the manifest during `cap sync`. On Android 7.1+, these appear on long-press of the app icon. No additional configuration needed.

## Testing Checklist

- [ ] Widget appears in Android widget picker after install
- [ ] Widget shows "No tasks right now" when NOW pool is empty
- [ ] Widget shows first NOW task title when tasks exist
- [ ] Widget shows correct focus minutes for today
- [ ] "Start Focus" button opens app to `/focus?quick=1`
- [ ] Tapping task text opens app to `/tasks`
- [ ] Widget updates within 30 minutes of data change
- [ ] Widget respects dark theme (uses MindShift surface colors)
- [ ] Widget preview image displays correctly in picker

## File Checklist

After implementation, these files should exist in the `android/` directory:

```
android/app/src/main/
  java/com/mindshift/app/
    MainActivity.kt              (modified — register WidgetBridgePlugin)
    MindShiftWidgetProvider.kt   (new)
    WidgetBridgePlugin.kt        (new)
  res/
    drawable/
      widget_background.xml      (new)
    drawable-nodpi/
      widget_preview.png         (new — design asset)
    layout/
      widget_mindshift.xml       (new)
    xml/
      widget_info.xml            (new)
    values/
      strings.xml                (modified — add widget_description)
  AndroidManifest.xml            (modified — add receiver)
```

Web-side:
```
src/shared/lib/native.ts        (modified — add updateWidgetData)
```
