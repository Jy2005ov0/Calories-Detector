package com.caloriesdetector.app;

import android.Manifest;
import android.content.Context;
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
 * A small native helper for W on Android: the phone's total step count since it was switched on
 * (the step sensor keeps counting while W is closed).
 */
@CapacitorPlugin(name = "WNative")
public class WNativePlugin extends Plugin {

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
}
