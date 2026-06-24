resource "google_artifact_registry_repository" "quetzaltv" {
  location      = var.region
  repository_id = "quetzaltv"
  format        = "DOCKER"
  description   = "Imágenes Docker de los microservicios de Quetzal TV"
}
