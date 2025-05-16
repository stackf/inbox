<template>
  <div>
    <a :href="`https://accounts.google.com/o/oauth2/v2/auth?client_id=${gmailClientId}&redirect_uri=${gmailRedirectUri}&response_type=code&scope=https://www.googleapis.com/auth/gmail.modify&access_type=offline&prompt=consent`">Generate GMAIL Auth Token</a>
  </div>
</template>
<script setup>
const gmailClientId = import.meta.env.VITE_GMAIL_CLIENT_ID 
const gmailRedirectUri = import.meta.env.VITE_GMAIL_REDIRECT_URI
</script>