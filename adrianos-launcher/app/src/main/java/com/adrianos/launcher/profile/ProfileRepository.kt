package com.adrianos.launcher.profile

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepository @Inject constructor(private val dao: ProfileDao) {

    fun getActiveProfile(): Flow<Profile?> = dao.observeActive()

    fun getAllProfilesFlow(): Flow<List<Profile>> = dao.observeAll()

    suspend fun getAllProfiles(): List<Profile> = dao.getAll()

    suspend fun setActiveProfile(id: ProfileId) {
        dao.deactivateAll()
        dao.setActive(id)
    }

    suspend fun upsert(profile: Profile) = dao.upsert(profile)

    suspend fun initDefaults() {
        if (dao.count() == 0) {
            defaultProfiles().forEach { dao.upsert(it) }
        }
    }
}
