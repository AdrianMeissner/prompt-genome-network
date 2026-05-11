package com.adrianos.launcher.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val AdrianDarkScheme = darkColorScheme(
    background = Color(0xFF0D0D0D),
    surface = Color(0xFF1A1A1A),
    surfaceVariant = Color(0xFF2C2C2E),
    primary = Color(0xFF7C4DFF),
    onPrimary = Color.White,
    secondary = Color(0xFF555555),
    onBackground = Color.White,
    onSurface = Color.White,
)

@Composable
fun AdrianOSTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AdrianDarkScheme,
        content = content,
    )
}
