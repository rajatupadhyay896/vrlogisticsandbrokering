FROM node:22-alpine AS ui
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY frontend frontend
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS api
WORKDIR /build
COPY backend/pom.xml .
COPY backend/src src
COPY --from=ui /build/frontend/dist src/main/resources/static
RUN mvn -B -ntp package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=api /build/target/freight-1.0.0.jar app.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
