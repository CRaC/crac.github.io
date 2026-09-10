---
title: "Using CRaC"
linkTitle: "Overview"
weight: 13
eyebrow: "Deployment"
lede: "CRaC's deployment scheme follows from where the image has to come from."
description: "The deployment scheme CRaC implies: warm an application up, take an image, ship the image."
---
<!--
CRaC allows to start Java applications that are already initialized and warmed-up.
Deployment scheme reflects the need to collect the required data.
-->

## Why the scheme looks like this

CRaC deployment scheme reflects the need to collect data required for Java application initialization and warm-up.

An image has to come from a JVM that has already done the work worth keeping —
loaded its classes and compiled its hot paths. That cannot happen at build
time, so the application is run and exercised first, and the image it produces
becomes part of what ships.

## The three stages

![Operation Flow](/images/flow/flow.png)

1. a Java application (or container) is deployed in the canary environment
    * the app processes canary requests that triggers class loading and JIT compilation
2. the running application is checkpointed by some mean
    * this creates the image of the JVM and application; the image is considered as a part of a new deployment bundle
3. the Java application with the image are deployed in the production environment
    * the restored Java process uses loaded classes from and JIT code from the immediately

## Read more

{{% children sort="weight" %}}