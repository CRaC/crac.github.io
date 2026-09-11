---
title: "Runtimes with CRaC support"
linkTitle: "Runtimes with CRaC"
weight: 18
eyebrow: "Prerequisite"
description: "CRaC has to be built into the Java runtime. The upstream builds, the vendor builds, and the criu permissions they need."
---
To use the CRaC functionality, you need a Java runtime that has support for CRaC integrated.

Runtimes differ in more than whether they have CRaC at all: the mechanism that
takes the image is selectable, and which mechanisms a build offers is part of
what you are choosing between. See
[checkpoint engines](/reference/engines/).

## OpenJDK CRaC

{{% button href="https://crac.github.io/openjdk-builds" style="blue" icon="rocket" %}}LATEST OPENJDK CRAC RELEASE{{% /button %}}

The OpenJDK CRaC Project is developed in the [GitHub repository github.com/openjdk/crac](https://github.com/openjdk/crac). 

**NOTE**: The JDK archive should be extracted with `sudo`.

```sh
$ sudo tar zxf <jdk>.tar.gz
```

When using CRaC, if you see an `Operation not permitted` error, you may have to update your `criu` permissions with:

```sh
sudo chown root:root $JAVA_HOME/lib/criu
sudo chmod u+s $JAVA_HOME/lib/criu
```

## Azul Zulu Builds of OpenJDK

{{% button href="https://www.azul.com/downloads/?package=jdk-crac#zulu" style="blue" icon="rocket" %}}DOWNLOAD AZUL ZULU WITH CRAC{{% /button %}}

Azul ships Zulu builds with CRaC integrated for Java 17, 21 and every feature release since, on Linux/x64 and Linux/Arm64, for both glibc and musl. These are the builds that take a real checkpoint.

Zulu builds with CRaC are also published for Windows and macOS, but for development only: there a checkpoint request is served by an immediate restore, without an image ever being written to disk. That is enough to exercise the CRaC code paths of an application on a laptop before it is deployed on Linux.

Note that the platform only limits where a checkpoint can be *taken*. An application compiled against [`org.crac`](/about/about-crac/#orgcrac) runs on any Java runtime, with or without CRaC support.

Azul's builds also carry additions that are not part of the OpenJDK project, e.g. the `warp` engine, and those are documented at
[docs.azul.com/crac](https://docs.azul.com/crac/) rather than on this site.

## BellSoft Liberica JDK

{{% button href="https://bell-sw.com/pages/downloads/?package=jdk-crac" style="blue" icon="rocket" %}}DOWNLOAD LIBERICA JDK WITH CRAC{{% /button %}}

BellSoft publishes dedicated Liberica JDK builds with CRaC for Java 17 and 21, on Linux x86-64 and AArch64, as archives and as container images. They are documented at [bell-sw.com](https://bell-sw.com/libericajdk-with-crac/).

## Canonical builds of OpenJDK

{{% button href="https://packages.ubuntu.com/search?keywords=openjdk-21-crac" style="blue" icon="rocket" %}}OPENJDK WITH CRAC FOR UBUNTU{{% /button %}}

Canonical packages CRaC-enabled OpenJDK in the Ubuntu archive, so it installs with `apt` and carries Ubuntu's security maintenance. The source packages are `openjdk-17-crac` and `openjdk-21-crac`, in the archive since Ubuntu 24.10 and present in 26.04 LTS:

```sh
sudo apt install openjdk-21-crac-jdk
```

They install next to the regular `openjdk-17` and `openjdk-21` packages rather than replacing them, so a machine can have both. Canonical describes the wider set of builds at [ubuntu.com/toolchains/java](https://ubuntu.com/toolchains/java).

## AWS Lambda SnapStart

{{% button href="https://aws.amazon.com/blogs/compute/starting-up-faster-with-aws-lambda-snapstart/" style="blue" icon="rocket" %}}MORE INFO ABOUT AWS LAMBDA SNAPSTART{{% /button %}}

AWS Lambda SnapStart is a performance optimization developed by AWS that can significantly improve the startup time for applications. This feature delivers up to 10x faster function startup times for latency-sensitive Java applications at no extra cost, and with minimal or no code changes.

## Other runtimes with checkpoint/restore

**Eclipse OpenJ9**, which is the VM in **IBM Semeru Runtimes**, reaches the same
place by a different road. Its own feature is [CRIU Support](https://eclipse.dev/openj9/docs/criusupport/),
enabled with `-XX:+EnableCRIUSupport` and driven by the `openj9.criu` API — but
OpenJ9 also implements the CRaC API on top of it, and publishes the
[`jdk.crac.management` javadoc](https://eclipse.dev/openj9/docs/api/jdk21/jdk.management/jdk/crac/management/CRaCMXBean.html)
to prove it. An application written against `org.crac` can therefore run there.
It is also what [Open Liberty InstantOn](https://openliberty.io/docs/latest/instanton.html)
is built on, whose [`crac-1.4` feature](https://openliberty.io/docs/latest/reference/feature/crac-1.4.html)
exposes `org.crac` to a Liberty application.

**Alibaba Dragonwell** carries CRaC in its Extended Edition, listed in its own
[release notes](https://github.com/dragonwell-project/dragonwell11/wiki/Alibaba-Dragonwell-11-Extended-Edition-Release-Notes).

Neither is a drop-in for the builds above — the enabling switches, the editions
and the supported platforms are the vendor's own, and the vendor's documentation
is where those are kept right.
