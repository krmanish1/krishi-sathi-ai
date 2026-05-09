# Custom entry so we can prepend include paths before ReactAndroid prefab headers.
# react-android AAR ships graphicsConversions.h using std::format, which breaks NDK 26 (folly::format).
# This must be global: autolinked codegen targets (e.g. safe_area_context) also include that header.
cmake_minimum_required(VERSION 3.13)
project(appmodules)

set(KRISHI_CXX_PATCH "${CMAKE_CURRENT_SOURCE_DIR}/../../../../cxx-include-patch")
include_directories(BEFORE ${KRISHI_CXX_PATCH})

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)
