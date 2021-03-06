(function() {

params={};
location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(s,k,v){params[k]=v});

function generateSecret(fn) {
  $.ajax({
    type: 'POST',
    url: '/new-totp-secret',
    contentType: 'application/json',
    dataType: 'json',
  })
  .done(function(data) {
    fn(undefined, data);
  })
  .fail(function(xhr, status) {
    $.notify('Error when generating TOTP secret');
  });
}

function onSecretGenerated(err, secret) {
  console.log('secret generated successfully', secret);
  console.log('OTP Auth URL=', secret.otpauth_url);
  new QRCode(document.getElementById("qrcode"), secret.otpauth_url);
  $("#secret").text(secret.base32);
}

function redirect() {
  var redirect_uri = '/login';
  if('redirect' in params) {
    redirect_uri = params['redirect'];
  }
  window.location.replace(redirect_uri);
}

$(document).ready(function() {
  generateSecret(onSecretGenerated);
  $('#login-button').on('click', function() {
    redirect();
  });
});
})();
