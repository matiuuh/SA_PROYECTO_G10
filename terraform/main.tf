terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # El bucket quetzaltv-tf-state debe crearse manualmente antes de terraform init:
  #   gcloud storage buckets create gs://quetzaltv-tf-state \
  #     --location=us-central1 --project=sa-proyecto-g10-500320
  backend "gcs" {
    bucket = "quetzaltv-tf-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}
