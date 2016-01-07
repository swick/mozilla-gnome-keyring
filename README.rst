=====================
mozilla-gnome-keyring
=====================

A mozilla extension to store passwords and form logins in gnome-keyring

This replaces the default password manager in Firefox and Thunderbird
with an implementation which uses Gnome Keyring. This is a centralised
system-based password manager, which is more simple to handle than
per-application management.

You need ``libgnome-keyring0`` to be installed, for this extension to
work. When this extension is enabled, passwords stored in the default
password manager are not accessible. See `migrating old passwords`_
for an efficient set of instructions to manually work around this.

You can find more technical information on `bugzilla issue`_ or on the
`github project pages`_.

.. _bugzilla issue: https://bugzilla.mozilla.org/show_bug.cgi?id=309807
.. _github project pages: https://github.com/swick/mozilla-gnome-keyring

=====
Usage
=====

You can change the keyring in which passwords are saved by creating or
editing the preference item ``extensions.gnome-keyring.keyringName``.
The default keyring is ``mozilla``. This is a per-profile setting, so if
you don't manually change it, all profiles will share the same keyring.

You can backup your passwords easily, separately from the rest of your
mozilla profile. Your keyrings are stored ``~/.gnome2/keyrings`` - even
gnome-keyring 3.0-3.16 does this, though this may change in the future.

You can also take advantage of the more fine-tuned keyring management
features of gnome-keyring, such as:

* No need to prompt for password, if you store in the ``login`` keyring
  and the password for that keyring is the same as your login password.
* If the keyring is already open, don't need to prompt for a password
  each time you start Firefox or Thunderbird.
* You can explicitly re-lock the keyring when you feel you need to.
* In gnome-keyring 3, the keyring password prompt disables keyboard
  input to other windows, so you don't need to worry about accidentally
  typing it somewhere you shouldn't

Note: gnome-keyring stores the passwords encrypted on permanent storage
but it keeps unlocked passwords in memory without encryption. As a
result, programs with access to the memory space of gnome-keyring (such
as debuggers and applications running as root) may be able to extract
the passwords. The same applies to the default Firefox and Thunderbird
implementations, so this extension should not be any less secure.

=================================
Non-working cases and workarounds
=================================

Passwords will not be saved or filled in if:

* the username or password element has attribute ``autocomplete="on"``

  * workaround: delete the attribute using the DOM inspector

* the username or password element is already filled in by the page

  * see https://bugzilla.mozilla.org/show_bug.cgi?id=618698
  * note: not a browser bug

* (mozilla bug): the page is XML+XSLT

  * see https://bugzilla.mozilla.org/show_bug.cgi?id=354706

Actually, these issues are all browser issues, and not directly fixable
by this extension.

=======================
Migrating old passwords
=======================

This extension cannot migrate passwords on its own.  However you can use the
`Password Exporter`_ extension to export your passwords from the default
password manager and then re-import them into gnome-keyring:

* Before installing this extension install the `Password Exporter`_ extension.
* Export all the passwords saved in Firefox' password manager to a XML file.
* Install this extension and restart Firefox.
* Import the passwords from the previously exported file.  They will be stored
  in the keyring specified by ``extensions.gnome-keyring.keyringName``.
* Once you're done, you are free uninstall the `Password Exporter`_ extension
  and shred_ the XML file.

The old data of the default password manager remains untouched, so you
also need to delete that manually if you want to. This is done by going
to your profile folder, and shred_-ing ``key3.db`` and ``signons.sqlite``.
After deleting, the data may still be forensically retrievable from your
disk, but if you were protecting it with a master password, this data
would still be be encrypted.

Deleting old data will also clear the master password for the default
password manager. If you don't clear it, you'll still be asked for it
when you choose to "show passwords", even if this extension is active.

.. _Password Exporter: https://addons.mozilla.org/en-US/firefox/addon/password-exporter/
.. _shred: https://www.gnu.org/software/coreutils/manual/html_node/shred-invocation.html
