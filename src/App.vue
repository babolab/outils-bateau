<template>
  <!-- Nav globale : sera étoffée à chaque nouvel outil ajouté -->
  <nav class="nav-principale">
    <span class="logo">⚓ Outils Bateau</span>
    <RouterLink to="/">🌡️ Météo Époxy</RouterLink>
    <RouterLink to="/courant">⚓ Courant</RouterLink>
  </nav>
  <RouterView />
</template>

<style>
.nav-principale {
  background: #0a1220;
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.nav-principale .logo {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text);
}
.nav-principale a {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.95rem;
}
.nav-principale a:hover,
.nav-principale a.router-link-active {
  color: var(--text);
}
</style>
