const nodemailer = require('nodemailer');

/**
 * Email Notificaties Service
 * Stuurt automatische emails naar docenten met:
 * - Lage voorraad waarschuwingen (≤10 items)
 * - Nieuwe reserveringen afgelopen week
 * - Onderdelen die te laat zijn
 */

// Email configuratie
// BELANGRIJK: Voor productie moet je mail-credentials toevoegen
const transporter = nodemailer.createTransport({
    // Development: gebruik https://mailtrap.io of vergelijkbare service
    // Of voeg je eigen SMTP settings toe
    host: process.env.MAIL_HOST || 'localhost',
    port: process.env.MAIL_PORT || 1025,
    secure: process.env.MAIL_SECURE === 'true' || false,
    auth: process.env.MAIL_USER ? {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
    } : undefined,
    tls: {
        rejectUnauthorized: false // Voor development
    }
});

/**
 * Haal alle onderdelen met lage voorraad op
 */
async function getLowStockItems(db) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, naam, categorie, aantal, min_hoeveelheid
            FROM onderdelen
            WHERE aantal <= 10
            ORDER BY aantal ASC
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Haal nieuwe reserveringen van afgelopen 7 dagen op
 */
async function getNewReservations(db) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                r.id,
                r.onderdeel_id,
                o.naam as onderdeel_naam,
                r.gereserveerd_door,
                r.aantal,
                r.status,
                r.aanvraag_datum
            FROM reserveringen r
            JOIN onderdelen o ON r.onderdeel_id = o.id
            WHERE date(r.aanvraag_datum) >= date('now', '-7 days')
            ORDER BY r.aanvraag_datum DESC
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Haal onderdelen op die te laat zijn (return datum voorbij)
 */
async function getOverdueItems(db) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                r.id,
                r.onderdeel_id,
                o.naam as onderdeel_naam,
                r.gereserveerd_door,
                r.aantal,
                r.retour_datum,
                CAST((julianday('now') - julianday(r.retour_datum)) AS INTEGER) as dagen_verlopen
            FROM reserveringen r
            JOIN onderdelen o ON r.onderdeel_id = o.id
            WHERE r.status = 'actief'
            AND datetime(r.retour_datum) < datetime('now')
            ORDER BY r.retour_datum ASC
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Haal alle docenten op (users met role 'docent')
 */
async function getTeachers(db) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, username, email
            FROM users
            WHERE role = 'docent'
            AND email IS NOT NULL
            AND email != ''
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Genereer HTML email body
 */
function generateEmailHTML(lowStock, newReservations, overdueItems) {
    let html = `
        <h2>📊 Slim Opslagsysteem - Wekelijkse Update</h2>
        <p>Hallo,</p>
        <p>Dit is jouw automatische wekelijkse notificatie met updates over het opslagsysteem.</p>
    `;

    // Lage voorraad sectie
    if (lowStock.length > 0) {
        html += `
            <hr>
            <h3>⚠️ Lage Voorraad Waarschuwing (≤10 items)</h3>
            <p><strong>${lowStock.length} onderdeel(en) bijna op</strong></p>
            <ul>
        `;
        lowStock.forEach(item => {
            html += `
                <li>
                    <strong>${item.naam}</strong> 
                    (${item.categorie}): 
                    <strong style="color: #d9534f;">${item.aantal}x</strong> 
                    beschikbaar
                </li>
            `;
        });
        html += `</ul>`;
    }

    // Nieuwe reserveringen sectie
    if (newReservations.length > 0) {
        html += `
            <hr>
            <h3>📋 Nieuwe Reserveringen (Afgelopen Week)</h3>
            <p><strong>${newReservations.length} nieuwe reservering(en)</strong></p>
            <ul>
        `;
        newReservations.forEach(res => {
            html += `
                <li>
                    <strong>${res.onderdeel_naam}</strong>: 
                    ${res.aantal}x gereserveerd door ${res.gereserveerd_door}
                    (${new Date(res.aanvraag_datum).toLocaleDateString('nl-NL')})
                </li>
            `;
        });
        html += `</ul>`;
    }

    // Te laat sectie
    if (overdueItems.length > 0) {
        html += `
            <hr>
            <h3>🚨 Onderdelen Te Laat! (Return deadline voorbij)</h3>
            <p><strong style="color: #d9534f;">${overdueItems.length} onderdeel(en) moet(en) teruggegeven worden</strong></p>
            <ul>
        `;
        overdueItems.forEach(item => {
            html += `
                <li>
                    <strong>${item.onderdeel_naam}</strong>: 
                    ${item.aantal}x - ${item.dagen_verlopen} dagen verlopen!
                    (Gereserveerd door: ${item.gereserveerd_door})
                </li>
            `;
        });
        html += `</ul>`;
    }

    if (lowStock.length === 0 && newReservations.length === 0 && overdueItems.length === 0) {
        html += `
            <hr>
            <p>✅ Alles ziet er goed uit! Er zijn geen lage voorraad waarschuwingen, geen nieuwe reserveringen of verlopen items.</p>
        `;
    }

    html += `
        <hr>
        <p style="color: #666; font-size: 12px;">
            Dit is een automatisch gegenereerde email. 
            Meld je aan in het systeem voor meer details.
        </p>
    `;

    return html;
}

/**
 * Stuur email naar één docent
 */
async function sendNotificationEmail(teacher, lowStock, newReservations, overdueItems) {
    const mailOptions = {
        from: process.env.MAIL_FROM || 'noreply@slimopslagsysteem.local',
        to: teacher.email,
        subject: '📧 Slim Opslagsysteem - Wekelijkse Notificatie',
        html: generateEmailHTML(lowStock, newReservations, overdueItems),
        text: `Slim Opslagsysteem Update\n\nLage voorraad: ${lowStock.length} items\nNieuwe reserveringen: ${newReservations.length}\nTe late items: ${overdueItems.length}`
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error(`❌ Email verzenden naar ${teacher.email} mislukt:`, err);
                reject(err);
            } else {
                console.log(`✅ Email verzonden naar ${teacher.email}:`, info.response);
                resolve(info);
            }
        });
    });
}

/**
 * Stuur wekelijkse notificaties naar alle docenten
 * Wordt aangeroepen door node-cron (elke maandag om 08:00)
 */
async function sendWeeklyNotifications(db) {
    console.log('\n📧 Starting weekly email notifications...');
    try {
        // Verzamel alle data
        const [lowStock, newReservations, overdueItems, teachers] = await Promise.all([
            getLowStockItems(db),
            getNewReservations(db),
            getOverdueItems(db),
            getTeachers(db)
        ]);

        console.log(`📊 Data verzameld: ${lowStock.length} lage voorraad, ${newReservations.length} nieuwe reserveringen, ${overdueItems.length} verlopen items`);
        console.log(`👥 Verzenden naar ${teachers.length} docent(en)`);

        // Stuur email naar elke docent
        const emailPromises = teachers.map(teacher =>
            sendNotificationEmail(teacher, lowStock, newReservations, overdueItems)
                .catch(err => ({ error: err, teacher: teacher.email }))
        );

        const results = await Promise.allSettled(emailPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`✅ Email notificaties voltooid: ${successful} verzonden, ${failed} mislukt\n`);
        return { successful, failed, lowStock, newReservations, overdueItems };

    } catch (error) {
        console.error('❌ Fout bij weekly notifications:', error);
        throw error;
    }
}

module.exports = {
    sendWeeklyNotifications,
    sendNotificationEmail,
    getLowStockItems,
    getNewReservations,
    getOverdueItems,
    getTeachers
};
