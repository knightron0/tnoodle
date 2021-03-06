package org.worldcubeassociation.tnoodle.server

import io.ktor.application.Application
import io.ktor.application.install
import io.ktor.features.*
import io.ktor.http.*
import io.ktor.routing.routing
import io.ktor.serialization.json
import io.ktor.server.engine.ShutDownUrl
import org.worldcubeassociation.tnoodle.server.routing.JsEnvHandler
import org.worldcubeassociation.tnoodle.server.routing.IconHandler
import org.worldcubeassociation.tnoodle.server.routing.VersionHandler
import org.worldcubeassociation.tnoodle.server.serial.JsonConfig

class TNoodleServer(val environmentConfig: ServerEnvironmentConfig) : ApplicationHandler {
    override fun spinUp(app: Application) {
        val versionHandler = VersionHandler(environmentConfig)

        app.routing {
            JsEnvHandler.install(this)
            IconHandler.install(this)
            versionHandler.install(this)
        }

        app.install(ShutDownUrl.ApplicationCallFeature) {
            shutDownUrl = KILL_URL
            exitCodeSupplier = { 0 }
        }

        app.install(DefaultHeaders)

        app.install(CORS) {
            anyHost()
            method(HttpMethod.Put)
        }

        app.install(ContentNegotiation) {
            json(json = JsonConfig.SERIALIZER)
        }
    }

    companion object {
        const val KILL_URL = "/kill/tnoodle/now"
    }
}
