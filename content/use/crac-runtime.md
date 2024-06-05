+++
title = "Java Runtime with CRaC Support"
weight = 25
+++

To use the CRAC functionality, you need a Java runtime that has support for CRaC integrated.

## Azul Zulu Builds of OpenJDK

Azul integrated full CRaC functionality for Linux/x64 and Linux/Arm64, in version 17, 21, and 22 of Azul Zulu Builds of OpenJDK. This means, for now, you can run an application with CRaC on any system thanks to the crac.org dependency, but only on the specified OS systems the CRaC functionality in the JVM will work.

As of January 2024, downloads are also available for Windows and macOS of Zulu with CRaC support, but only for development purposes. With these runtimes you are able to simulate the CRaC functionality. When you request a checkpoint, it is created and immediately restored without dumping the checkpoint to disk. This enables you to develop and test the CRaC functionality on these platforms, so you can deploy your application with confidence on Linux.

You can download Zulu from the [Azul Downloads page](https://www.azul.com/downloads/?package=jdk-crac#zulu).

## AWS Lambda SnapStart

AWS Lambda SnapStart is a performance optimization developed by AWS that can significantly improve the startup time for applications. This feature delivers up to 10x faster function startup times for latency-sensitive Java applications at no extra cost, and with minimal or no code changes. 

More info is available on [Starting up faster with AWS Lambda SnapStart](https://aws.amazon.com/blogs/compute/starting-up-faster-with-aws-lambda-snapstart/).
