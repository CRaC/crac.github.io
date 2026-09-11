---
title: "Frameworks with CRaC support"
linkTitle: "Frameworks"
weight: 30
eyebrow: "Ecosystem"
lede: "Several frameworks ship CRaC support, which means an application usually does not have to implement the coordination itself."
description: "Frameworks and libraries that coordinate with CRaC, so an application inherits the coordination."
---
## Proof-of-Concept CRaC support implementation

Proof-of concept CRaC support was implemented in a few third-party frameworks and libraries.

Source code links are below.
Builds can be found in [Maven Central](https://mvnrepository.com/artifact/io.github.crac) under `io.github.crac` artifact-id.

## Frameworks

Several frameworks provide CRaC functionality out-of-the-box.
Each of the pages below covers how that framework coordinates with a checkpoint, and what an application still has to do itself.

{{% children sort="weight" %}}

## More projects with CRaC support

CRaC support reaches further than the frameworks with pages here.
Each of these links to that project's own documentation of its support, which is where the detail is kept up to date.

{{< more-frameworks >}}

A project is on that list when its own documentation says it supports CRaC.
Work that is under way but not yet released — and there is a fair amount of it — belongs on the [crac-dev mailing list](https://mail.openjdk.org/mailman/listinfo/crac-dev) rather than here, because a list like this one is read as a promise.