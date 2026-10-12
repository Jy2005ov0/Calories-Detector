package com.caloriesdetector.app;

import android.Manifest;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Small native helpers for W on Android:
 * - the phone's total step count since it was switched on (the step sensor keeps counting while W is closed),
 * - the home-screen widget: W sends today's numbers, the widget's "+ water" taps are collected here.
 */
@CapacitorPlugin(name = "WNative")
public class WNativePlugin extends Plugin {

    static final String PREFS = "w_widget";

    @PluginMethod
    public void stepTotal(PluginCall call) {
        Context ctx = getContext();
        SensorManager sm = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);
        Sensor sensor = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        JSObject out = new JSObject();
        if (sensor == null) {
            out.put("available", false);
            call.resolve(out);
            return;
        }
        if (Build.VERSION.SDK_INT >= 29 && ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
            out.put("available", true);
            out.put("permission", false);
            call.resolve(out);
            return;
        }
        final boolean[] done = { false };
        final Handler handler = new Handler(Looper.getMainLooper());
        final SensorEventListener listener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (done[0]) return;
                done[0] = true;
                sm.unregisterListener(this);
                JSObject res = new JSObject();
                res.put("available", true);
                res.put("permission", true);
                res.put("total", (long) event.values[0]);
                call.resolve(res);
            }

            @Override
            public void onAccuracyChanged(Sensor s, int accuracy) {}
        };
        sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL);
        // The sensor reports at once on most phones; give up after a few seconds.
        handler.postDelayed(() -> {
            if (done[0]) return;
            done[0] = true;
            sm.unregisterListener(listener);
            JSObject res = new JSObject();
            res.put("available", true);
            res.put("permission", true);
            call.resolve(res);
        }, 4000);
    }

    /** Today's numbers for the widget, as JSON written by W (labels already in the app's language). */
    @PluginMethod
    public void updateWidget(PluginCall call) {
        String json = call.getString("json", "{}");
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString("data", json).apply();
        WWidgetProvider.refreshAll(getContext());
        call.resolve();
    }

    /** Water added from the widget since W last looked, then reset. */
    @PluginMethod
    public void takeWidgetWater(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSObject out = new JSObject();
        out.put("ml", prefs.getInt("pendingWater", 0));
        out.put("date", prefs.getString("pendingDate", ""));
        prefs.edit().putInt("pendingWater", 0).apply();
        call.resolve(out);
    }

    @PluginMethod
    public void hasWidget(PluginCall call) {
        AppWidgetManager m = AppWidgetManager.getInstance(getContext());
        int[] ids = m.getAppWidgetIds(new ComponentName(getContext(), WWidgetProvider.class));
        JSObject out = new JSObject();
        out.put("count", ids.length);
        call.resolve(out);
    }
}
