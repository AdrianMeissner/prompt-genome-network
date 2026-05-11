package com.adrianos.launcher.gesture

import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraManager
import android.os.Handler
import android.os.Looper
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.VelocityTracker
import com.adrianos.launcher.profile.ProfileStateMachine
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs
import kotlin.math.atan2

private const val VELOCITY_THRESHOLD = 800f   // dp/s
private const val EDGE_THRESHOLD_DP = 20f
private const val DIAGONAL_TOLERANCE_DEG = 30f

@Singleton
class GestureEngine @Inject constructor(
    @ApplicationContext private val context: Context,
    private val profileStateMachine: ProfileStateMachine,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val density = context.resources.displayMetrics.density
    private val handler = Handler(Looper.getMainLooper())

    var gestureMap: Map<GestureZone, GestureAction> = defaultGestureConfig()

    private var velocityTracker: VelocityTracker? = null
    private var downX = 0f
    private var downY = 0f
    private var pointerCount = 0

    private val internalDetector = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
        override fun onDoubleTap(e: MotionEvent): Boolean {
            dispatch(GestureZone.DOUBLE_TAP)
            return true
        }

        override fun onFling(
            e1: MotionEvent?,
            e2: MotionEvent,
            velocityX: Float,
            velocityY: Float
        ): Boolean {
            val dx = e2.x - (e1?.x ?: e2.x)
            val dy = e2.y - (e1?.y ?: e2.y)
            val speed = Math.hypot(velocityX.toDouble(), velocityY.toDouble()).toFloat()
            if (speed < VELOCITY_THRESHOLD * density) return false

            val angleDeg = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()
            val zone = classifyAngle(angleDeg, pointerCount)
            if (zone != null) dispatch(zone)
            return true
        }
    })

    fun onTouchEvent(event: MotionEvent): Boolean {
        pointerCount = event.pointerCount
        if (event.action == MotionEvent.ACTION_DOWN) {
            downX = event.x; downY = event.y
            velocityTracker?.recycle()
            velocityTracker = VelocityTracker.obtain()
        }
        velocityTracker?.addMovement(event)
        return internalDetector.onTouchEvent(event)
    }

    private fun classifyAngle(deg: Float, fingers: Int): GestureZone? {
        if (fingers >= 2) return GestureZone.TWO_FINGER_SWIPE_UP

        return when {
            isDiagonal(deg, 315f) || isDiagonal(deg, -45f) -> GestureZone.SWIPE_DIAGONAL_NE
            isDiagonal(deg, 135f)                           -> GestureZone.SWIPE_DIAGONAL_SW
            abs(deg) < 45                                   -> GestureZone.SWIPE_RIGHT
            abs(deg) > 135                                  -> GestureZone.SWIPE_LEFT
            deg in 45f..135f                                -> GestureZone.SWIPE_DOWN
            else                                            -> GestureZone.SWIPE_UP
        }
    }

    private fun isDiagonal(angle: Float, target: Float): Boolean {
        val diff = abs((angle - target + 360) % 360)
        return diff < DIAGONAL_TOLERANCE_DEG || diff > 360 - DIAGONAL_TOLERANCE_DEG
    }

    private fun dispatch(zone: GestureZone) {
        val action = gestureMap[zone] ?: GestureAction.None
        scope.launch { executeAction(action) }
    }

    private suspend fun executeAction(action: GestureAction) {
        when (action) {
            is GestureAction.OpenCamera -> {
                val intent = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            }
            is GestureAction.ToggleFocusMode -> {
                // Notify HomeViewModel via shared StateFlow — keep engine decoupled
                FocusModeEventBus.toggle()
            }
            is GestureAction.Flashlight -> toggleFlashlight()
            is GestureAction.OpenApp -> {
                context.packageManager.getLaunchIntentForPackage(action.packageName)
                    ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    ?.let { context.startActivity(it) }
            }
            is GestureAction.RunMacro -> executeMacro(action.steps)
            else -> { /* handled by HomeActivity observers */ }
        }
    }

    private suspend fun executeMacro(steps: List<MacroStep>) {
        steps.forEach { step ->
            if (step.delayMs > 0) kotlinx.coroutines.delay(step.delayMs)
            executeAction(step.action)
        }
    }

    private var flashOn = false
    private fun toggleFlashlight() {
        val cm = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val cameraId = cm.cameraIdList.firstOrNull() ?: return
        flashOn = !flashOn
        cm.setTorchMode(cameraId, flashOn)
    }
}

object FocusModeEventBus {
    private val _events = kotlinx.coroutines.flow.MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val events: kotlinx.coroutines.flow.SharedFlow<Unit> = _events
    fun toggle() { _events.tryEmit(Unit) }
}
