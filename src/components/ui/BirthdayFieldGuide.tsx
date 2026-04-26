// BIRTHDAY INPUT — Add this to your Settings profile section
// In src/app/(dashboard)/settings/page.tsx, add inside the profile form:

/*
Find the section where users edit their profile (name, email, etc.)
Add this field after the existing fields:

<div>
  <label className="block text-sm text-gray-600 mb-1">Date of birth (optional)</label>
  <input
    type="date"
    value={birthday}
    onChange={e => setBirthday(e.target.value)}
    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
    style={{ transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }}
  />
  <p className="text-xs text-gray-400 mt-1">We'll send you a birthday greeting and remind your team about client birthdays.</p>
</div>

Add state: const [birthday, setBirthday] = useState('')
Load it: setBirthday(profile.date_of_birth || '')
Save it: include date_of_birth: birthday || null in your update object
*/

// For CONTACTS — add birthday in the contact form on account detail pages:
/*
In the contacts tab or add-contact form, add:

<div>
  <label className="block text-sm text-gray-600 mb-1">Birthday</label>
  <input type="date" value={contactBirthday} onChange={e => setContactBirthday(e.target.value)}
    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
</div>

Include date_of_birth: contactBirthday || null when inserting/updating contacts.
*/

export {}
