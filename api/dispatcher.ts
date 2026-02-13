function isRequest(arg: any): arg is Request {
    return arg instanceof Request;
}

import { vercelAdapter, webAdapter } from './utils/adapter.js';

import * as add_admin_user from '../netlify/functions/add-admin-user.js';
import * as admin_security_controls from '../netlify/functions/admin-security-controls.js';
import * as broadcast_schedule from '../netlify/functions/broadcast-schedule.js';
import * as client_ip from '../netlify/functions/client-ip.js';
import * as create_admin_device_session from '../netlify/functions/create-admin-device-session.js';
import * as create_admin from '../netlify/functions/create-admin.js';
import * as delete_admin_user from '../netlify/functions/delete-admin-user.js';
import * as delete_admin from '../netlify/functions/delete-admin.js';
import * as delete_r2_file from '../netlify/functions/delete-r2-file.js';
import * as force_logout from '../netlify/functions/force-logout.js';
import * as get_r2_upload_url from '../netlify/functions/get-r2-upload-url.js';
import * as grant_permissions from '../netlify/functions/grant-permissions.js';
import * as health from '../netlify/functions/health.js';
import * as heartbeat_schedule from '../netlify/functions/heartbeat-schedule.js';
import * as heartbeat from '../netlify/functions/heartbeat.js';
import * as heartbeat_fallback from '../netlify/functions/heartbeat_fallback.js';
import * as install_heartbeat from '../netlify/functions/install-heartbeat.js';
import * as list_admin_users from '../netlify/functions/list-admin-users.js';
import * as master_login from '../netlify/functions/master-login.js';
import * as notify_event_update from '../netlify/functions/notify-event-update.js';
import * as passkey_challenge from '../netlify/functions/passkey-challenge.js';
import * as passkey_delete from '../netlify/functions/passkey-delete.js';
import * as passkey_list from '../netlify/functions/passkey-list.js';
import * as passkey_login from '../netlify/functions/passkey-login.js';
import * as passkey_register from '../netlify/functions/passkey-register.js';
import * as purge_audit from '../netlify/functions/purge-audit.js';
import * as r2_garbage_collector from '../netlify/functions/r2-garbage-collector.js';
import * as send_confirmation from '../netlify/functions/send-confirmation.js';
import * as send_custom_email from '../netlify/functions/send-custom-email.js';
import * as send_rejection from '../netlify/functions/send-rejection.js';
import * as sync_google_drive from '../netlify/functions/sync-google-drive.js';
import * as update_admin_email from '../netlify/functions/update-admin-email.js';
import * as update_admin_password from '../netlify/functions/update-admin-password.js';
import * as update_form_settings from '../netlify/functions/update-form-settings.js';

const handlers: Record<string, any> = {
  'add-admin-user': add_admin_user,
  'admin-security-controls': admin_security_controls,
  'broadcast-schedule': broadcast_schedule,
  'client-ip': client_ip,
  'create-admin-device-session': create_admin_device_session,
  'create-admin': create_admin,
  'delete-admin-user': delete_admin_user,
  'delete-admin': delete_admin,
  'delete-r2-file': delete_r2_file,
  'force-logout': force_logout,
  'get-r2-upload-url': get_r2_upload_url,
  'grant-permissions': grant_permissions,
  'health': health,
  'heartbeat-schedule': heartbeat_schedule,
  'heartbeat': heartbeat,
  'heartbeat_fallback': heartbeat_fallback,
  'install-heartbeat': install_heartbeat,
  'list-admin-users': list_admin_users,
  'master-login': master_login,
  'notify-event-update': notify_event_update,
  'passkey-challenge': passkey_challenge,
  'passkey-delete': passkey_delete,
  'passkey-list': passkey_list,
  'passkey-login': passkey_login,
  'passkey-register': passkey_register,
  'purge-audit': purge_audit,
  'r2-garbage-collector': r2_garbage_collector,
  'send-confirmation': send_confirmation,
  'send-custom-email': send_custom_email,
  'send-rejection': send_rejection,
  'sync-google-drive': sync_google_drive,
  'update-admin-email': update_admin_email,
  'update-admin-password': update_admin_password,
  'update-form-settings': update_form_settings,
};

export default async function (req: any, res: any) {
  const { fn } = req.query; // Query param from rewrite rule
  
  if (!fn) {
    res.status(400).send('Missing function name');
    return;
  }
  
  const funcName = Array.isArray(fn) ? fn[0] : fn;
  const mod = handlers[funcName];

  if (!mod) {
    res.status(404).send('Function not found: ' + funcName);
    return;
  }

  try {
      if (mod.handler) {
        return vercelAdapter(mod.handler)(req, res);
      } else if (mod.default) {
        // Assume default export is a Web API handler (Request -> Response)
        // If it takes Request, wrap it.
        // If it takes (req, res), run it directly?
        // But (req, res) is Vercel legacy. Modern Vercel functions use Web API.
        // Let's assume default export handles Request.
        return webAdapter(mod.default)(req, res);
      } else {
        res.status(500).send('Invalid function export');
      }
  } catch (e: any) {
      console.error(e);
      res.status(500).send(e.toString());
  }
}
