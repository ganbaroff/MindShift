# MindShift ProGuard/R8 rules — Capacitor WebView app
#
# Capacitor apps run JS in WebView. Native code is limited to:
# - Capacitor bridge + plugin interfaces
# - AndroidX libraries
# - OkHttp (used by Capacitor internals)

# -- Capacitor core + plugins --------------------------------------------------
-keep class com.getcapacitor.** { *; }
-keep class capacitor.** { *; }

# -- Cordova compatibility layer (used by some Capacitor plugins) ---------------
-keep class org.apache.cordova.** { *; }

# -- JavaScript bridge (WebView ↔ native) --------------------------------------
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# -- OkHttp (Capacitor network layer) ------------------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# -- AndroidX (prevent over-shrinking of used components) -----------------------
-keep class androidx.core.** { *; }
-keep class androidx.appcompat.** { *; }

# -- Preserve stack trace info for crash reporting ------------------------------
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# -- Remove verbose logging in release -----------------------------------------
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
}
