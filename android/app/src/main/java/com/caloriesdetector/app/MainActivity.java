package com.caloriesdetector.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // W's own native helpers (step counter total, home-screen widget).
        registerPlugin(WNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
