package com.adrianos.launcher.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.*
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import androidx.core.graphics.drawable.toBitmap
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.adrianos.launcher.gesture.GestureEngine
import com.adrianos.launcher.privacy.PrivacyDotManager
import com.adrianos.launcher.profile.ProfileId
import com.adrianos.launcher.quickactions.QuickActionsBarManager
import com.adrianos.launcher.ui.theme.AdrianOSTheme
import dagger.hilt.android.AndroidEntryPoint
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@AndroidEntryPoint
class HomeActivity : ComponentActivity() {

    private val viewModel: HomeViewModel by viewModels()

    @Inject lateinit var gestureEngine: GestureEngine
    @Inject lateinit var quickActionsBarManager: QuickActionsBarManager
    @Inject lateinit var privacyDotManager: PrivacyDotManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AdrianOSTheme {
                HomescreenRoot(viewModel)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        quickActionsBarManager.show()
        privacyDotManager.startMonitoring()
    }

    override fun onPause() {
        super.onPause()
        quickActionsBarManager.hide()
        privacyDotManager.stopMonitoring()
    }
}

@Composable
fun HomescreenRoot(viewModel: HomeViewModel) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0D0D0D))
    ) {
        Column(Modifier.fillMaxSize()) {
            ClockHeader()
            ProfileChipRow(
                activeProfileId = uiState.activeProfile?.id,
                onSwitch = viewModel::switchProfile
            )
            if (uiState.suggestedApps.isNotEmpty()) {
                SuggestionRow(apps = uiState.suggestedApps, onLaunch = viewModel::launchApp)
            }
            AppGrid(
                apps = uiState.apps,
                isFocusMode = uiState.isFocusMode,
                onLaunch = viewModel::launchApp,
                modifier = Modifier.weight(1f)
            )
        }

        SearchBar(
            query = uiState.searchQuery,
            isActive = uiState.isSearchActive,
            onQueryChange = viewModel::setSearchQuery,
            onActiveChange = viewModel::setSearchActive,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 96.dp, start = 24.dp, end = 24.dp)
        )

        FocusPill(
            isFocusMode = uiState.isFocusMode,
            onToggle = viewModel::toggleFocusMode,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 20.dp, bottom = 160.dp)
        )
    }
}

@Composable
private fun ClockHeader() {
    var time by remember { mutableStateOf("") }
    var date by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        while (true) {
            val now = Date()
            time = SimpleDateFormat("HH:mm", Locale.getDefault()).format(now)
            date = SimpleDateFormat("EEE, d MMM", Locale.getDefault()).format(now)
            kotlinx.coroutines.delay(1000)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 56.dp, start = 28.dp, bottom = 8.dp)
    ) {
        Text(
            text = time,
            fontSize = 64.sp,
            fontWeight = FontWeight.Light,
            color = Color.White,
            letterSpacing = (-2).sp,
        )
        Text(
            text = date,
            fontSize = 14.sp,
            fontWeight = FontWeight.Normal,
            color = Color(0xFF888888),
            letterSpacing = 0.5.sp,
        )
    }
}

@Composable
private fun ProfileChipRow(
    activeProfileId: ProfileId?,
    onSwitch: (ProfileId) -> Unit,
) {
    val profiles = ProfileId.entries
    Row(
        modifier = Modifier
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        profiles.forEach { id ->
            val isActive = id == activeProfileId
            val scale by animateFloatAsState(if (isActive) 1.08f else 1f, label = "chip_scale")
            val alpha by animateFloatAsState(if (isActive) 1f else 0.5f, label = "chip_alpha")

            FilterChip(
                selected = isActive,
                onClick = { onSwitch(id) },
                label = {
                    Text(
                        text = id.name.replace("_", " ").lowercase()
                            .replaceFirstChar { it.uppercase() },
                        fontSize = 12.sp,
                    )
                },
                modifier = Modifier
                    .scale(scale)
                    .alpha(alpha),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFF2C2C2E),
                    selectedLabelColor = Color.White,
                    containerColor = Color(0xFF1C1C1E),
                    labelColor = Color(0xFF888888),
                ),
            )
        }
    }
}

@Composable
private fun SuggestionRow(apps: List<AppInfo>, onLaunch: (AppInfo) -> Unit) {
    Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) {
        Text(
            "Suggested",
            fontSize = 11.sp,
            color = Color(0xFF555555),
            fontWeight = FontWeight.Medium,
            letterSpacing = 1.sp,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            apps.take(4).forEach { app -> AppIconItem(app = app, onClick = { onLaunch(app) }) }
        }
    }
}

@Composable
fun AppGrid(
    apps: List<AppInfo>,
    isFocusMode: Boolean,
    onLaunch: (AppInfo) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(5),
        modifier = modifier.padding(horizontal = 12.dp),
        contentPadding = PaddingValues(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        itemsIndexed(apps, key = { _, app -> app.packageName }) { index, app ->
            val delay = (index % 20) * 20
            val scale by animateFloatAsState(
                targetValue = if (isFocusMode) 0.92f else 1f,
                animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                label = "icon_scale_$index"
            )
            val alpha by animateFloatAsState(
                targetValue = if (isFocusMode) 0.55f else 1f,
                label = "icon_alpha_$index"
            )

            AppIconItem(
                app = app,
                onClick = { onLaunch(app) },
                modifier = Modifier
                    .scale(scale)
                    .alpha(alpha)
            )
        }
    }
}

@Composable
fun AppIconItem(
    app: AppInfo,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    Column(
        modifier = modifier
            .clickable(onClick = onClick)
            .padding(6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        val bitmap = remember(app.packageName) {
            try { app.icon.toBitmap(108, 108).asImageBitmap() } catch (e: Exception) { null }
        }

        if (bitmap != null) {
            Box(contentAlignment = Alignment.Center) {
                Image(
                    bitmap = bitmap,
                    contentDescription = app.label,
                    modifier = Modifier.size(52.dp),
                )
                if (app.isPreloaded) {
                    val infiniteAnim = rememberInfiniteTransition(label = "preload_pulse")
                    val pulseAlpha by infiniteAnim.animateFloat(
                        initialValue = 0.3f, targetValue = 0.8f,
                        animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
                        label = "pulse_alpha"
                    )
                    Box(
                        modifier = Modifier
                            .size(58.dp)
                            .border(1.dp, Color.White.copy(alpha = pulseAlpha), CircleShape)
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchBar(
    query: String,
    isActive: Boolean,
    onQueryChange: (String) -> Unit,
    onActiveChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val borderAlpha by animateFloatAsState(if (isActive) 0.4f else 0.08f, label = "search_border")

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp)
            .background(Color(0xFF1A1A1A), RoundedCornerShape(28.dp))
            .border(1.dp, Color.White.copy(alpha = borderAlpha), RoundedCornerShape(28.dp))
            .clickable { onActiveChange(true) },
        contentAlignment = Alignment.CenterStart,
    ) {
        if (!isActive) {
            Text(
                "Ask anything",
                color = Color(0xFF555555),
                fontSize = 14.sp,
                modifier = Modifier.padding(start = 20.dp)
            )
        } else {
            BasicSearchField(query = query, onQueryChange = onQueryChange, onDismiss = { onActiveChange(false) })
        }
    }
}

@Composable
private fun BasicSearchField(query: String, onQueryChange: (String) -> Unit, onDismiss: () -> Unit) {
    androidx.compose.foundation.text.BasicTextField(
        value = query,
        onValueChange = onQueryChange,
        singleLine = true,
        textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 14.sp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        decorationBox = { inner ->
            if (query.isEmpty()) Text("Ask anything...", color = Color(0xFF666666), fontSize = 14.sp)
            inner()
        }
    )
}

@Composable
private fun FocusPill(isFocusMode: Boolean, onToggle: () -> Unit, modifier: Modifier = Modifier) {
    val bgColor by animateColorAsState(
        if (isFocusMode) Color(0xFFCF1020) else Color(0xFF2C2C2E),
        label = "focus_bg"
    )

    Surface(
        onClick = onToggle,
        modifier = modifier,
        shape = RoundedCornerShape(24.dp),
        color = bgColor,
        tonalElevation = 4.dp,
    ) {
        Text(
            text = if (isFocusMode) "FOCUS" else "FOCUS",
            color = Color.White,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.5.sp,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
        )
    }
}
