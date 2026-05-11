package com.adrianos.launcher.wallpaper

import android.graphics.*
import android.service.wallpaper.WallpaperService
import android.view.SurfaceHolder
import java.util.Calendar
import kotlin.math.*

class AdrianWallpaperService : WallpaperService() {
    override fun onCreateEngine(): Engine = AdrianWallpaperEngine()

    inner class AdrianWallpaperEngine : Engine() {
        private var width = 0
        private var height = 0
        private var visible = false
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        // Breathing animation state
        private var breathPhase = 0f
        private var lastFrameTime = 0L

        private val drawRunnable = object : Runnable {
            override fun run() {
                if (visible) {
                    draw()
                    surfaceHolder.surface.let { }
                    handler.postDelayed(this, 50) // 20fps — wallpaper doesn't need 60
                }
            }
        }

        override fun onSurfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
            this.width = width
            this.height = height
            draw()
        }

        override fun onVisibilityChanged(v: Boolean) {
            visible = v
            if (v) handler.post(drawRunnable) else handler.removeCallbacks(drawRunnable)
        }

        override fun onSurfaceDestroyed(holder: SurfaceHolder) {
            visible = false
            handler.removeCallbacks(drawRunnable)
        }

        private fun draw() {
            val canvas = surfaceHolder.lockCanvas() ?: return
            try {
                val now = System.currentTimeMillis()
                val dt = if (lastFrameTime == 0L) 0.05f else (now - lastFrameTime) / 1000f
                lastFrameTime = now
                breathPhase = (breathPhase + dt * 0.25f) % (2 * PI.toFloat())

                val breathBrightness = 1f + 0.04f * sin(breathPhase)
                val variant = timeVariant()
                val (topColor, bottomColor) = gradientForVariant(variant)

                val shader = LinearGradient(
                    0f, 0f, 0f, height.toFloat(),
                    scaleColor(topColor, breathBrightness),
                    scaleColor(bottomColor, breathBrightness),
                    Shader.TileMode.CLAMP,
                )
                paint.shader = shader
                canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
                paint.shader = null

                drawNoiseOverlay(canvas)
            } finally {
                surfaceHolder.unlockCanvasAndPost(canvas)
            }
        }

        private fun timeVariant(): String {
            val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
            return when (h) {
                in 5..9   -> "dawn"
                in 10..17 -> "day"
                in 18..21 -> "dusk"
                else      -> "night"
            }
        }

        private fun gradientForVariant(v: String): Pair<Int, Int> = when (v) {
            "dawn"  -> Pair(Color.parseColor("#1a1a2e"), Color.parseColor("#E07B5D"))
            "day"   -> Pair(Color.parseColor("#0D0D0D"), Color.parseColor("#1a1a2e"))
            "dusk"  -> Pair(Color.parseColor("#1a1a2e"), Color.parseColor("#8B3A00"))
            "night" -> Pair(Color.parseColor("#000000"), Color.parseColor("#0D0D1A"))
            else    -> Pair(Color.BLACK, Color.BLACK)
        }

        private fun scaleColor(color: Int, scale: Float): Int {
            val r = (Color.red(color) * scale).toInt().coerceIn(0, 255)
            val g = (Color.green(color) * scale).toInt().coerceIn(0, 255)
            val b = (Color.blue(color) * scale).toInt().coerceIn(0, 255)
            return Color.rgb(r, g, b)
        }

        private val noisePaint = Paint().apply { alpha = 12 }
        private fun drawNoiseOverlay(canvas: Canvas) {
            // Lightweight grain: draw random dots for film-grain texture
            val rng = java.util.Random(System.currentTimeMillis() / 100)
            repeat(200) {
                val x = rng.nextInt(width).toFloat()
                val y = rng.nextInt(height).toFloat()
                val v = rng.nextInt(200) + 55
                noisePaint.color = Color.rgb(v, v, v)
                canvas.drawPoint(x, y, noisePaint)
            }
        }
    }
}
