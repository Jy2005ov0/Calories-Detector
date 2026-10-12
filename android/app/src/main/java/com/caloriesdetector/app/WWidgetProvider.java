package com.caloriesdetector.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

/** Home-screen widget: calories left, protein and water today, with a one-tap "+ water" button. */
public class WWidgetProvider extends AppWidgetProvider {

    static final String ADD_WATER = "com.caloriesdetector.app.ADD_WATER";

    static void refreshAll(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        int[] ids = m.getAppWidgetIds(new ComponentName(ctx, WWidgetProvider.class));
        for (int id : ids) m.updateAppWidget(id, views(ctx));
    }

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    static RemoteViews views(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(WNativePlugin.PREFS, Context.MODE_PRIVATE);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.w_widget);
        try {
            JSONObject d = new JSONObject(prefs.getString("data", "{}"));
            boolean fresh = today().equals(d.optString("date"));
            int pending = today().equals(prefs.getString("pendingDate", "")) ? prefs.getInt("pendingWater", 0) : 0;
            // A new day before W was opened: show a clean slate rather than yesterday's numbers.
            int kcalLeft = fresh ? d.optInt("kcalLeft", 0) : d.optInt("kcalTarget", 0);
            int protein = fresh ? d.optInt("protein", 0) : 0;
            int water = (fresh ? d.optInt("waterMl", 0) : 0) + pending;
            v.setTextViewText(R.id.w_kcal, String.valueOf(Math.abs(kcalLeft)));
            v.setTextViewText(R.id.w_kcal_label, kcalLeft < 0 ? d.optString("overLabel", "kcal over") : d.optString("leftLabel", "kcal left"));
            v.setTextViewText(R.id.w_protein, d.optString("proteinLabel", "Protein") + " " + protein + " / " + d.optInt("proteinGoal", 0) + " g");
            v.setTextViewText(R.id.w_water, d.optString("waterLabel", "Water") + " " + String.format(Locale.US, "%.2f", water / 1000.0) + " / " + String.format(Locale.US, "%.1f", d.optInt("waterGoal", 2000) / 1000.0) + " L");
            v.setTextViewText(R.id.w_add, "+ " + d.optInt("cupMl", 250) + " ml");
        } catch (Exception e) {
            v.setTextViewText(R.id.w_kcal, "–");
        }
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open != null) v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        Intent add = new Intent(ctx, WWidgetProvider.class).setAction(ADD_WATER);
        v.setOnClickPendingIntent(R.id.w_add, PendingIntent.getBroadcast(ctx, 1, add, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        return v;
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, views(ctx));
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (!ADD_WATER.equals(intent.getAction())) return;
        SharedPreferences prefs = ctx.getSharedPreferences(WNativePlugin.PREFS, Context.MODE_PRIVATE);
        int cup = 250;
        try {
            cup = new JSONObject(prefs.getString("data", "{}")).optInt("cupMl", 250);
        } catch (Exception ignored) {}
        String day = today();
        int pending = day.equals(prefs.getString("pendingDate", "")) ? prefs.getInt("pendingWater", 0) : 0;
        prefs.edit().putInt("pendingWater", pending + cup).putString("pendingDate", day).apply();
        refreshAll(ctx);
    }
}
