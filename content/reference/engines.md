---
title: "Checkpoint engines"
weight: 15
eyebrow: "Reference"
description: "Choosing the mechanism that takes the image, with -XX:CRaCEngine — what upstream ships, and what a vendor build may add."
---

CRaC's API is deliberately mechanism-agnostic: it tells your application that a
checkpoint is happening without saying how. The mechanism that actually takes
the image is a separate choice, made with `-XX:CRaCEngine=`.

Which engines exist depends on the runtime, not on the API — so this is
something to check about a build rather than something to assume.

## Engines in OpenJDK CRaC

Upstream ships two.

| Engine | What it does |
| --- | --- |
| `criuengine` | Checkpoints through [CRIU](https://criu.org/), the Linux kernel's checkpoint/restore in userspace. This is the default on Linux and the one that needs elevated permissions — see [runtimes with CRaC support](/use/crac-runtime/) for the `criu` setuid step, and `CHECKPOINT_RESTORE` and `SYS_PTRACE` capabilities in a container. |
| `simengine` | Simulates the cycle: a checkpoint is immediately followed by a restore, in the same process, with nothing written to disk. |

`simengine` is the one that makes development on a machine that cannot really
checkpoint possible. It exercises the code you wrote — every `Resource` gets
`beforeCheckpoint` and then `afterRestore` — so a missing coordination shows up
as an exception on your laptop rather than in the environment that can take a
real image. It does not tell you whether the image would have been valid.

## Engines in a vendor build

A runtime may add its own, and those are the vendor's to document. **Azul's
builds add a `warp` engine**, which does not use CRIU and needs no elevated
privileges for either checkpoint or restore — the practical consequence being
that it works where you cannot grant `CHECKPOINT_RESTORE` and `SYS_PTRACE`.

It is not part of the OpenJDK project, so the details, the platforms it covers
and which Azul builds have which parts of it are documented by Azul:

{{% button href="https://docs.azul.com/crac/usage/crac-engines" %}}CRaC engines in Azul's documentation{{% /button %}}

Two things worth knowing before a deployment depends on a vendor engine:

- **Process identity is not guaranteed to survive.** An application restored
  under `warp` does not keep the PID and thread IDs it had at checkpoint. If
  anything outside the JVM keys on those, it will not agree with the restored
  process.
- **An engine in one build is not an engine in another.** Selecting one ties
  the deployment to that runtime as firmly as any other vendor extension.

## Checking what a build offers

The engine is selected at checkpoint time, alongside the other CRaC options:

```sh
java -XX:CRaCEngine=simengine -XX:CRaCCheckpointTo=./image -jar app.jar
```

A build that does not have the engine you named will say so at start-up rather
than at checkpoint time, which is the failure you want — it happens before the
application has done any work worth keeping.
