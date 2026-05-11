package com.adrianos.launcher.quickactions

import android.content.Context
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.graphics.*
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.*
import androidx.lifecycle.*
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import com.adrianos.launcher.R
import com.adrianos.launcher.ui.theme.AdrianOSTheme
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

data class QuickAction(
    val iconRes: Int,
    val label: String,
    val onClick: () -> Unit,
)

@Singleton
class QuickActionsBarManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private var overlayView: View? = null
    private var offsetY = 0

    private val defaultActions: List<QuickAction> = listOf(
        QuickAction(android.R.drawable.ic_menu_camera, "Camera") { openCamera() },
        QuickAction(android.R.drawable.ic_menu_search, "Search") { },
        QuickAction(android.R.drawable.ic_menu_myplaces, "Maps") { openMaps() },
        QuickAction(android.R.drawable.ic_menu_edit, "Note") { },
        QuickAction(android.R.drawable.ic_menu_info_details, "Focus") { },
    )

    fun show() {
        if (overlayView != null) return

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = 200
        }

        val composeView = buildComposeView(params)
        overlayView = composeView
        try {
            windowManager.addView(composeView, params)
        } catch (e: Exception) {
            overlayView = null
        }
    }

    fun hide() {
        overlayView?.let {
            try { windowManager.removeView(it) } catch (e: Exception) { }
            overlayView = null
        }
    }

    private fun buildComposeView(params: WindowManager.LayoutParams): ComposeView {
        val view = ComposeView(context).apply {
            setContent {
                AdrianOSTheme {
                    QuickActionsBar(
                        actions = defaultActions,
                        onDrag = { dy ->
                            params.y = (params.y - dy.toInt()).coerceIn(80, 600)
                            try { windowManager.updateViewLayout(this@apply, params) } catch (e: Exception) { }
                        }
                    )
                }
            }
        }
        view.setViewTreeLifecycleOwner(StandaloneLifecycleOwner())
        view.setViewTreeSavedStateRegistryOwner(StandaloneSavedStateRegistryOwner())
        return view
    }

    private fun openCamera() {
        val intent = android.content.Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE)
            .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    private fun openMaps() {
        val intent = context.packageManager.getLaunchIntentForPackage("com.google.android.apps.maps")
            ?.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        intent?.let { context.startActivity(it) }
    }
}

@Composable
private fun QuickActionsBar(
    actions: List<QuickAction>,
    onDrag: (Float) -> Unit,
) {
    var isDragging by remember { mutableStateOf(false) }
    var lastY by remember { mutableFloatStateOf(0f) }

    Surface(
        shape = RoundedCornerShape(28.dp),
        color = Color(0xCC121212),
        border = BorderStroke(0.5.dp, Color(0xFF333333)),
        modifier = Modifier
            .width(280.dp)
            .height(52.dp)
            .pointerInput(Unit) {
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent()
                        val ptr = event.changes.firstOrNull() ?: continue
                        when {
                            ptr.pressed && !isDragging -> { lastY = ptr.position.y; isDragging = true }
                            ptr.pressed && isDragging  -> { onDrag(ptr.position.y - lastY); lastY = ptr.position.y }
                            else                       -> isDragging = false
                        }
                    }
                }
            }
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            actions.forEachIndexed { index, action ->
                if (index > 0) {
                    Box(
                        modifier = Modifier
                            .width(0.5.dp)
                            .height(24.dp)
                            .background(Color(0xFF333333))
                    )
                }
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clickable { action.onClick() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        painter = painterResource(id = action.iconRes),
                        contentDescription = action.label,
                        tint = Color(0xFFCCCCCC),
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
        }
    }
}

private class StandaloneLifecycleOwner : LifecycleOwner {
    private val registry = LifecycleRegistry(this)
    override val lifecycle: Lifecycle get() = registry
    init { registry.currentState = Lifecycle.State.RESUMED }
}

private class StandaloneSavedStateRegistryOwner : SavedStateRegistryOwner {
    private val controller = SavedStateRegistryController.create(this)
    override val savedStateRegistry: SavedStateRegistry get() = controller.savedStateRegistry
    override val lifecycle: Lifecycle = LifecycleRegistry(this).also {
        it.currentState = Lifecycle.State.RESUMED
    }
    init { controller.performAttach(); controller.performRestore(null) }
}
