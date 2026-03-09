FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Nexus.sln .
COPY Nexus.Core/Nexus.Core.csproj Nexus.Core/
COPY Nexus.Infrastructure/Nexus.Infrastructure.csproj Nexus.Infrastructure/
COPY Nexus.API/Nexus.API.csproj Nexus.API/

RUN dotnet restore

COPY . .
RUN dotnet publish Nexus.API/Nexus.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 5000

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Nexus.API.dll"]
