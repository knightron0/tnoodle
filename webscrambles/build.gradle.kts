import configurations.Languages.attachRepositories
import configurations.Languages.configureJava
import configurations.Server.configureWinstonePlugin
import configurations.Server.configureEmbeddedRunnable

import dependencies.Libraries.BATIK_ALL
import dependencies.Libraries.BOUNCYCASTLE
import dependencies.Libraries.ITEXTPDF
import dependencies.Libraries.JODA_TIME
import dependencies.Libraries.SNAKEYAML
import dependencies.Libraries.ZIP4J

description = "A server plugin wrapper for scrambles that also draws pdfs."

attachRepositories()

plugins {
    java
    application
    SHADOW
}

configureJava()
configureWinstonePlugin()

dependencies {
    implementation(project(":scrambles"))

    implementation(JODA_TIME)
    implementation(ZIP4J)
    implementation(ITEXTPDF)
    implementation(BATIK_ALL)
    implementation(SNAKEYAML)
    implementation(BOUNCYCASTLE)

    "server"(project(":scrambler-interface"))

    runtime(project(":tnoodle-ui"))
}

configureEmbeddedRunnable()

tasks.getByName("processResources") {
    dependsOn(":tnoodle-ui:assemble")
}
