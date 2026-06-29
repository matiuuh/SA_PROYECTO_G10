resource "google_storage_bucket" "backups" {
  name          = "quetzaltv-backups-${var.project_id}"
  location      = var.region
  force_destroy = true

  # Limpia backups con más de 30 días automáticamente
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  uniform_bucket_level_access = true
}

resource "google_storage_bucket" "streaming" {
  name          = "quetzaltv-streaming-g10"
  location      = var.region
  force_destroy = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"]
    response_header = ["Content-Type", "Access-Control-Allow-Origin", "Authorization"]
    max_age_seconds = 3600
  }

  # Acceso a nivel de objeto para permitir signed URLs V4
  uniform_bucket_level_access = false
}
