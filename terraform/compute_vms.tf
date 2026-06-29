locals {
  ubuntu_image = "ubuntu-os-cloud/ubuntu-2204-lts"

  ssh_metadata = {
    ssh-keys = "${var.ssh_user}:${var.ssh_public_key}"
  }
}

# ── VM1 — usuario · suscripcion · catalogo ────────────────────────────────────
resource "google_compute_instance" "vm1" {
  name         = "quetzaltv-vm1"
  machine_type = var.vm_machine_type_app
  zone         = var.zone
  tags         = ["quetzaltv-vm"]

  boot_disk {
    initialize_params {
      image = local.ubuntu_image
      size  = 30
      type  = "pd-standard"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.quetzaltv_subnet.id
    access_config {}
  }

  metadata = local.ssh_metadata

  service_account {
    email  = google_service_account.deploy_sa.email
    scopes = ["cloud-platform"]
  }
}

# ── VM2 — streaming · cobros · divisas · notificaciones · redis ───────────────
resource "google_compute_instance" "vm2" {
  name         = "quetzaltv-vm2"
  machine_type = var.vm_machine_type_app
  zone         = var.zone
  tags         = ["quetzaltv-vm"]

  boot_disk {
    initialize_params {
      image = local.ubuntu_image
      size  = 30
      type  = "pd-standard"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.quetzaltv_subnet.id
    access_config {}
  }

  metadata = local.ssh_metadata

  service_account {
    email  = google_service_account.deploy_sa.email
    scopes = ["cloud-platform"]
  }
}

# ── VM3 — PostgreSQL (servidor externo de BD — fuera de GKE, obligatorio) ─────
resource "google_compute_instance" "vm3" {
  name         = "quetzaltv-vm3"
  machine_type = var.vm_machine_type_db
  zone         = var.zone
  tags         = ["quetzaltv-vm", "quetzaltv-monitoring-target"]

  boot_disk {
    initialize_params {
      image = local.ubuntu_image
      size  = 50
      type  = "pd-standard"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.quetzaltv_subnet.id
    access_config {}
  }

  metadata = local.ssh_metadata

  service_account {
    email  = google_service_account.deploy_sa.email
    scopes = ["cloud-platform"]
  }
}

# ── VM4 — api-gateway · frontend ──────────────────────────────────────────────
resource "google_compute_instance" "vm4" {
  name         = "quetzaltv-vm4"
  machine_type = var.vm_machine_type_app
  zone         = var.zone
  tags         = ["quetzaltv-vm", "quetzaltv-public"]

  boot_disk {
    initialize_params {
      image = local.ubuntu_image
      size  = 20
      type  = "pd-standard"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.quetzaltv_subnet.id
    access_config {}
  }

  metadata = local.ssh_metadata

  service_account {
    email  = google_service_account.deploy_sa.email
    scopes = ["cloud-platform"]
  }
}
