# Template-uri EmailJS – MathUP

Mesajele de suport sunt salvate ca tickete în baza de date și vizibile în **Admin → Suport**.
Nu se mai trimite email către echipă (`EMAILJS_TEMPLATE_ID` / Contact Us).

## Auto-reply suport (`support-autoreply.html`)


Copiază conținutul HTML în **EmailJS → Email Templates → Create New Template → Content (HTML)**.



### Setări template EmailJS



| Câmp EmailJS | Valoare |

|--------------|---------|

| **Template name** | MathUP – Confirmare suport |

| **Subject** | `Am primit mesajul tău – MathUP [#{{request_id}}]` |

| **To Email** | `{{email}}` sau `{{to_email}}` |

| **From Name** | `MathUP Suport` |

| **Reply To** | `mathupbacalaureat@gmail.com` (sau `{{reply_to}}`) |



### Variabile necesare (`template_params`)



Aceste câmpuri trebuie trimise din Edge Function `submit-support-request`:



| Variabilă | Exemplu |

|-----------|---------|

| `to_email` | emailul elevului |
| `email` | același email (dacă template-ul folosește `{{email}}` la To) |

| `reply_to` | email suport (opțional) |

| `user_name` | Nume complet |

| `user_email` | Email elev |

| `subject` | Subiectul mesajului |

| `category_label` | Facturare / Problemă tehnică / … |

| `request_id` | UUID cerere |

| `created_at` | Data ISO |

| `message` | Textul mesajului |



### Secret Supabase



```

EMAILJS_AUTOREPLY_TEMPLATE_ID=template_xxxxxxxxx

```



### Test în EmailJS



Folosește **Test It** cu valori de probă:



```json

{

  "to_email": "test@example.com",

  "user_name": "Andrei Ionescu",

  "user_email": "test@example.com",

  "subject": "Problemă la lecția de integrale",

  "category_label": "Problemă tehnică",

  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",

  "created_at": "2026-05-28T18:30:00.000Z",

  "message": "Nu pot accesa lecția după login."

}

```


