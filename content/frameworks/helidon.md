---
title: "Helidon"
weight: 25
eyebrow: "Framework"
description: "The Helidon CRaC integration, and the Resumable API an application registers with."
---
Helidon has shipped CRaC support since 4.2, as a preview feature — Helidon's own
documentation says the feature is subject to change and will be finalized in a
later release, so treat the API below as not yet settled.

Add one dependency:

```xml
<dependency>
    <groupId>io.helidon.integrations.crac</groupId>
    <artifactId>helidon-integrations-crac</artifactId>
</dependency>
```

## How the coordination is wired

Helidon does not call `org.crac` from its own components. Instead
`io.helidon.common.resumable` in Helidon core defines two types of its own:

* `Resumable` — a component that wants `suspend()` before the checkpoint and
  `resume()` after the restore.
* `ResumableSupport` — the registry those components register with, plus
  `uptime()`, `uptimeSinceResume()` and `resumeTime()`.

`ResumableSupport` is a service interface with no implementation in core. The
CRaC integration module is what provides one, so adding the dependency above is
the whole wiring step: it is what connects Helidon's suspend and resume
notifications to `org.crac`. Without it, code written against `Resumable` still
compiles and still runs — nothing coordinates.

## What Helidon coordinates for you

These are `Resumable` already, so they need nothing from an application:

* `LoomServer`, the WebServer itself — it closes its listeners before the
  checkpoint and rebinds them on restore. This is the "Restored all channels in
  3 milliseconds" line in the guide's output.
* `ClientConnectionCache` and `Http2ConnectionCache` — pooled outbound
  connections, which would otherwise be restored dead.
* `VThreadSystemMetersProvider`, so virtual-thread metrics survive the restore.

## What is left to the application

Anything holding a resource that does not survive a checkpoint — a connection,
a socket, a cached clock reading, a seeded PRNG — still has to coordinate. In
Helidon that goes through Helidon's own registry rather than `org.crac`
directly:

```java
ResumableSupport.get().register(this);
```

Two further things are worth knowing:

* Time is measured from the restore, not from JVM start. Code that reports
  start-up time or age should use `ResumableSupport.get().uptime()`, which
  returns time since resume when the process was restored and time since JVM
  start when it was not, rather than `RuntimeMXBean.getUptime()`.
* An application can take its own checkpoint instead of waiting for an external
  `jcmd`: `checkpointResumeOnStartup()` requests one and returns on a
  successful resume, and only acts when
  `-Dio.helidon.resumable.checkpoint=onStart` is set.

## Guides

Helidon documents the whole flow for both flavours, including a multi-stage
Dockerfile that warms the application up with `siege` and checkpoints it at
image-build time:

* [CRaC guide for Helidon MP](https://helidon.io/docs/v4/mp/guides/crac)
* [CRaC guide for Helidon SE](https://helidon.io/docs/v4/se/guides/crac)

Both guides note that full CRaC functionality needs Linux on x64 or ARM64, and
both use a checkpoint engine that does not need elevated privileges, which is
what makes the container build above work without a privileged step.
