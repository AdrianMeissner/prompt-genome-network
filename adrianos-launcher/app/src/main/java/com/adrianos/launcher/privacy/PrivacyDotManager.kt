package com.adrianos.launcher.privacy

import android.app.AppOpsManager
import android.content.Context
import android.graphics.PixelFormat
import android.os.Process
import android.view.Gravity
import android.view.WindowManager
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import androidx.lifecycle.*
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import com.adrianos.launcher.ui.theme.AdrianOSTheme
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import javax.inject.Inject
import javax.inject.Singleton

enum class PrivacyState { CLEAR, MIC_ACTIVE, CAM_ACTIVE, BOTH_ACTIVE }

@Singleton
class PrivacyDotManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    private var overlayView: ComposeView? = null
    private var monitorJob: Job? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val _privacyState = mutableStateOf(PrivacyState.CLEAR)

    fun startMonitoring() {
        if (overlayView != null) return
        showDot()
        monitorJob = scope.launch {
            while (isActive) {
                _privacyState.value = checkPrivacyState()
                delay(2000)
            }
        }
    }

    fun stopMonitoring() {
        monitorJob?.cancel()
        overlayView?.let {
            try { windowManager.removeView(it) } catch (e: Exception) { }
            overlayView = null
        }
    }

    private fun checkPrivacyState(): PrivacyState {
        val micActive = isOpActive(AppOpsManager.OPSTR_RECORD_AUDIO)
        val camActive = isOpActive(AppOpsManager.OPSTR_CAMERA)
        return when {
            micActive && camActive -> PrivacyState.BOTH_ACTIVE
            micActive              -> PrivacyState.MIC_ACTIVE
            camActive              -> PrivacyState.CAM_ACTIVE
            else                   -> PrivacyState.CLEAR
        }
    }

    private fun isOpActive(op: String): Boolean {
        return try {
            appOps.unsafeCheckOpNoThrow(op, Process.myUid(), context.packageName) ==
                    AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) {
            false
        }
    }

    private fun showDot() {
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = 16
            y = 48
        }

        val view = ComposeView(context).apply {
            setContent {
                AdrianOSTheme {
                    PrivacyDot(state = _privacyState.value)
                }
            }
        }
        view.setViewTreeLifecycleOwner(DotLifecycleOwner())
        view.setViewTreeSavedStateRegistryOwner(DotSavedStateOwner())
        overlayView = view
        try { windowManager.addView(view, params) } catch (e: Exception) { overlayView = null }
    }
}

@Composable
private fun PrivacyDot(state: PrivacyState) {
    var expanded by remember { mutableStateOf(false) }

    val dotColor = when (state) {
        PrivacyState.CLEAR       -> Color(0xFF444444)
        PrivacyState.MIC_ACTIVE  -> Color(0xFFFFBB00)
        PrivacyState.CAM_ACTIVE  -> Color(0xFFCF1020)
        PrivacyState.BOTH_ACTIVE -> Color(0xFFCF1020)
    }

    val infiniteAnim = rememberInfiniteTransition(label = "dot_pulse")
    val pulseScale by infiniteAnim.animateFloat(
        initialValue = 1f, targetValue = 1.4f,
        animationSpec = infiniteRepeatable(tween(800), RepeatMode.Reverse),
        label = "dot_scale"
    )
    val doPulse = state != PrivacyState.CLEAR

    Column(horizontalAlignment = Alignment.End) {
        Box(
            modifier = Modifier
                .size(if (doPulse) (10 * pulseScale).dp else 10.dp)
                .clip(CircleShape)
                .background(dotColor)
                .clickable { expanded = !expanded }
        )

        if (expanded && state != PrivacyState.CLEAR) {
            Spacer(Modifier.height(4.dp))
            Box(
                modifier = Modifier
                    .background(Color(0xEE1A1A1A), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(
                    text = when (state) {
                        PrivacyState.MIC_ACTIVE  -> "Mic in use"
                        PrivacyState.CAM_ACTIVE  -> "Camera in use"
                        PrivacyState.BOTH_ACTIVE -> "Mic + Camera"
                        else -> ""
                    },
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

private class DotLifecycleOwner : LifecycleOwner {
    private val registry = LifecycleRegistry(this)
    override val lifecycle: Lifecycle get() = registry
    init { registry.currentState = Lifecycle.State.RESUMED }
}

private class DotSavedStateOwner : SavedStateRegistryOwner {
    private val controller = SavedStateRegistryController.create(this)
    override val savedStateRegistry: SavedStateRegistry get() = controller.savedStateRegistry
    override val lifecycle: Lifecycle = LifecycleRegistry(this).also {
        it.currentState = Lifecycle.State.RESUMED
    }
    init { controller.performAttach(); controller.performRestore(null) }
}
