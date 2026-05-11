package com.adrianos.launcher.ui

import android.graphics.drawable.Drawable

data class AppInfo(
    val label: String,
    val packageName: String,
    val icon: Drawable,
    val dominantColor: Int = 0,
    val isPreloaded: Boolean = false,
)
