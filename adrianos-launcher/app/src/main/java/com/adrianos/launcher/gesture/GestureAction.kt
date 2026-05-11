package com.adrianos.launcher.gesture

sealed class GestureAction {
    object OpenCamera : GestureAction()
    object OpenAssistant : GestureAction()
    object ToggleFocusMode : GestureAction()
    object QuickNote : GestureAction()
    object Flashlight : GestureAction()
    object Screenshot : GestureAction()
    object PreviousApp : GestureAction()
    data class OpenApp(val packageName: String) : GestureAction()
    data class RunMacro(val steps: List<MacroStep>) : GestureAction()
    object None : GestureAction()
}

data class MacroStep(
    val action: GestureAction,
    val delayMs: Long = 0L,
)

enum class GestureZone {
    SWIPE_DOWN,
    SWIPE_UP,
    SWIPE_LEFT,
    SWIPE_RIGHT,
    SWIPE_DIAGONAL_NE,
    SWIPE_DIAGONAL_SW,
    DOUBLE_TAP,
    TWO_FINGER_SWIPE_UP,
}

data class GestureConfig(
    val zone: GestureZone,
    val action: GestureAction,
)

fun defaultGestureConfig(): Map<GestureZone, GestureAction> = mapOf(
    GestureZone.SWIPE_DOWN       to GestureAction.OpenCamera,
    GestureZone.SWIPE_LEFT       to GestureAction.QuickNote,
    GestureZone.SWIPE_RIGHT      to GestureAction.OpenAssistant,
    GestureZone.DOUBLE_TAP       to GestureAction.ToggleFocusMode,
    GestureZone.TWO_FINGER_SWIPE_UP to GestureAction.Screenshot,
    GestureZone.SWIPE_DIAGONAL_NE to GestureAction.Flashlight,
    GestureZone.SWIPE_DIAGONAL_SW to GestureAction.PreviousApp,
    GestureZone.SWIPE_UP         to GestureAction.None,
)
