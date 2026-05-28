# The Ledger — Scheduling Architecture

# Overview

The Ledger scheduling system is designed as an operational intelligence layer rather than a basic calendar system.

The scheduling system combines:

* operational planning,
* workforce utilization,
* financial forecasting,
* equipment allocation,
* and margin visibility.

---

# Core Concepts

# OperationalJob

The scheduling layer derives operational forecasting data from the canonical Job model.

Examples:

* forecasted margin
* labor exposure
* operational contribution
* equipment allocation
* conflict detection

This derived model powers:

* schedule cards
* intelligence strips
* operational drawers

---

# Weekly Intelligence Strip

The weekly intelligence strip provides:

* workforce utilization
* revenue forecasting
* labor cost forecasting
* overtime risk visibility
* operational contribution

This transforms scheduling into operational forecasting.

---

# Scheduling Objectives

The system is designed to optimize:

* operational profitability
* resource utilization
* workforce coordination
* operational visibility
* planning efficiency

---

# Resource Allocation

Scheduling currently models:

* workers
* equipment
* operational conflicts
* utilization percentages

Future versions will expand:

* dependency management
* shift planning
* route optimization
* geographic scheduling
* predictive forecasting

---

# Drawer Architecture

Operational drawers provide:

* job-level operational insights
* day-level rollups
* forecasting visibility
* resource allocation analysis

The drawer system uses discriminated TypeScript unions for strict runtime safety.

---

# Long-Term Vision

The scheduling system is intended to become one of Ledger’s primary differentiators.

Long-term goals include:

* predictive operational forecasting
* AI-assisted scheduling
* profitability optimization
* operational simulations
* real-time workforce intelligence
