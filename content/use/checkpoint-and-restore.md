---
title: "Checkpoint and restore"
weight: 30
eyebrow: "How to"
description: "Taking a checkpoint of a running JVM and restoring from the image."
---
**WARNING**: next is a proposal phase and is subject to change

Please refer to the [frameworks with CRaC support](/frameworks/), [step-by-step guide](https://github.com/CRaC/docs/blob/master/STEP-BY-STEP.md) or [best practices guide](/reference/best-practices/) to get an application with CRaC support.
The rest of the section is written for the [spring-boot example](#spring-boot).

## Starting a checkpointable JVM

For the first, Java command line parameter `-XX:CRaCCheckpointTo=PATH` defines a path to store the image and also allows the java instance to be checkpointed.
By the current implementation, the image is a directory with image files.
The directory will be created if it does not exist, but no parent directories are created.

```sh
export JAVA_HOME=./jdk
$JAVA_HOME/bin/java -XX:CRaCCheckpointTo=cr -jar target/example-spring-boot-0.0.1-SNAPSHOT.jar
```

## Warming it up

For the second, in another console: supply canary worload ...

```sh
$ curl localhost:8080
Greetings from Spring Boot!
```

## Taking the checkpoint

... and make a checkpoint by a jcmd command

```sh
$ jcmd target/example-spring-boot-0.0.1-SNAPSHOT.jar JDK.checkpoint
1563568:
Command executed successfully
```

Due to current jcmd implementation, success is always reported in jcmd output, problems are reported in the console of the application.

Another option to make the checkpoint is to invoke the `jdk.crac.Core.checkpointRestore()` method (see [API](#api)).
More options are possible in the future.

## Restoring

For the third, restore the `cr` image by `-XX:CRaCRestoreFrom=PATH` option

```sh
$JAVA_HOME/bin/java -XX:CRaCRestoreFrom=cr
```

## Choosing the mechanism

`-XX:CRaCCheckpointTo` says where the image goes; `-XX:CRaCEngine` says what
takes it. The default on Linux is CRIU, which is why the permissions step on
the [runtimes page](/use/crac-runtime/) exists — and `simengine` is what lets
you exercise this whole sequence on a machine that cannot checkpoint at all.
See [checkpoint engines](/reference/engines/).

{{% children sort="weight" %}}