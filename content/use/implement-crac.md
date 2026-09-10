---
title: "Implementing the CRaC API"
linkTitle: "Implementing the API"
weight: 20
eyebrow: "How to"
description: "Using org.crac to release and reacquire the resources a checkpoint cannot carry."
---
**WARNING**: next is a proposal phase and is subject to change

Please refer to the [frameworks with CRaC support](/frameworks/), [step-by-step guide](https://github.com/CRaC/docs/blob/master/STEP-BY-STEP.md) or [best practices guide](/reference/best-practices/) to get an application with CRaC support.
The rest of the section is written for the [spring-boot example](#spring-boot).

For the first, Java command line parameter `-XX:CRaCCheckpointTo=PATH` defines a path to store the image and also allows the java instance to be checkpointed.
By the current implementation, the image is a directory with image files.
The directory will be created if it does not exist, but no parent directories are created.

```sh
export JAVA_HOME=./jdk
$JAVA_HOME/bin/java -XX:CRaCCheckpointTo=cr -jar target/example-spring-boot-0.0.1-SNAPSHOT.jar
```

For the second, in another console: supply canary worload ...

```sh
$ curl localhost:8080
Greetings from Spring Boot!
```

... and make a checkpoint by a jcmd command

```sh
$ jcmd target/example-spring-boot-0.0.1-SNAPSHOT.jar JDK.checkpoint
1563568:
Command executed successfully
```

Due to current jcmd implementation, success is always reported in jcmd output, problems are reported in the console of the application.

Another option to make the checkpoint is to invoke the `jdk.crac.Core.checkpointRestore()` method (see [API](#api)).
More options are possible in the future.

For the third, restore the `cr` image by `-XX:CRaCRestoreFrom=PATH` option

```sh
$JAVA_HOME/bin/java -XX:CRaCRestoreFrom=cr
```

{{% children sort="weight" %}}