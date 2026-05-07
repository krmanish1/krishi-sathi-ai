package expo.modules.gemma

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.Package

class GemmaLlmPackage : Package {
  override fun createModules(): List<Module> = listOf(GemmaLlmModule())
}
