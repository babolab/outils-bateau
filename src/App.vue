<template>
  <!-- Nav globale : sera étoffée à chaque nouvel outil ajouté -->
  <nav class="nav-principale">
    <span class="logo">⚓ Outils Bateau</span>
    <RouterLink to="/">Météo Époxy</RouterLink>
  </nav>
  <RouterView />
</template>

<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #f4f7fb;
  color: #222;
}
.nav-principale {
  background: #1a3a5c;
  color: white;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.nav-principale .logo {
  font-weight: 700;
  font-size: 1.05rem;
}
.nav-principale a {
  color: #aad4f5;
  text-decoration: none;
  font-size: 0.95rem;
}
.nav-principale a:hover,
.nav-principale a.router-link-active {
  color: white;
}
</style>
