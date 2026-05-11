package com.adrianos.launcher.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.adrianos.launcher.R

class DailyGoalWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        appWidgetIds.forEach { id ->
            val views = buildViews(context)
            appWidgetManager.updateAppWidget(id, views)
        }
    }

    private fun buildViews(context: Context): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_daily_goal)
        // Goal text and progress are updated via repository in production;
        // here we set sensible defaults for the initial render.
        views.setTextViewText(R.id.goal_title, "Today's Goal")
        views.setTextViewText(R.id.goal_subtitle, "Tap to set your goal")
        views.setProgressBar(R.id.goal_progress, 5, 0, false)
        return views
    }
}
