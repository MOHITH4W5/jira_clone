# ---- Build stage ----
    FROM maven:3.9.9-eclipse-temurin-17 AS build
    WORKDIR /app
    COPY pom.xml .
    COPY src ./src
    RUN mvn clean package -DskipTests
    
    # ---- Run stage ----
    FROM eclipse-temurin:17-jre
    WORKDIR /app
    COPY --from=build /app/target/*.jar app.jar
    
    # Copy application.properties to /app/config/ 
    # Spring Boot automatically reads config/application.properties
    # from the working directory - this OVERRIDES the one inside the jar
    RUN mkdir -p /app/config
    COPY src/main/resources/application.properties /app/config/application.properties
    
    EXPOSE 8080
    ENTRYPOINT ["java", "-jar", "app.jar"]
    