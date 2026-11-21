# Haven API — Render / Docker
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests -Dmaven.test.skip=true package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/smart-community-api-1.0.0.jar app.jar
ENV JAVA_OPTS="-Xms128m -Xmx400m"
EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
