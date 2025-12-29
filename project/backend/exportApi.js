const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Excel Export Service
 * Exporteert alle systeem data naar een Excel bestand met meerdere sheets
 */

/**
 * Haal alle onderdelen op
 */
async function getAllOnderdelen(db) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                id, name, sku, description, 
                location, total_quantity, 
                category, links, image_url
            FROM onderdelen
            ORDER BY category, name
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Haal alle reserveringen op
 */
async function getAllReservations(db) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                r.id, r.onderdeel_id, o.name as onderdeel_naam,
                r.project_id, p.name as project_naam,
                r.checkout_by as gereserveerd_door, r.qty as aantal,
                r.status, r.created_at as aanvraag_datum, r.return_date as retour_datum,
                CASE 
                    WHEN r.status = 'checkout' AND datetime(r.return_date) < datetime('now') 
                    THEN CAST((julianday('now') - julianday(r.return_date)) AS INTEGER)
                    ELSE 0
                END as dagen_verlopen
            FROM reservations r
            JOIN onderdelen o ON r.onderdeel_id = o.id
            LEFT JOIN projects p ON r.project_id = p.id
            ORDER BY r.created_at DESC
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Haal alle projecten op
 */
async function getAllProjects(db) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                p.id, p.name, p.category_id, c.name as category_name,
                p.created_at,
                COUNT(r.id) as reservation_count
            FROM projects p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN reserveringen r ON p.id = r.project_id
            GROUP BY p.id
            ORDER BY p.name
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Genereer statistieken
 */
async function getStatistics(db) {
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((res, rej) => {
                db.get('SELECT COUNT(*) as count FROM onderdelen', (err, row) => {
                    if (err) rej(err);
                    else res(row?.count || 0);
                });
            }),
            new Promise((res, rej) => {
                db.get('SELECT COUNT(*) as count FROM reservations WHERE status = "checkout"', (err, row) => {
                    if (err) rej(err);
                    else res(row?.count || 0);
                });
            }),
            new Promise((res, rej) => {
                db.get('SELECT COUNT(*) as count FROM reservations WHERE status = "completed"', (err, row) => {
                    if (err) rej(err);
                    else res(row?.count || 0);
                });
            }),
            new Promise((res, rej) => {
                db.get('SELECT SUM(total_quantity) as total FROM onderdelen', (err, row) => {
                    if (err) rej(err);
                    else res(row?.total || 0);
                });
            }),
            new Promise((res, rej) => {
                db.get(`
                    SELECT COUNT(*) as count FROM reservations 
                    WHERE status = 'checkout' AND datetime(return_date) < datetime('now')
                `, (err, row) => {
                    if (err) rej(err);
                    else res(row?.count || 0);
                });
            })
        ]).then(([parts, activeRes, completedRes, totalItems, overdueRes]) => {
            resolve({
                totalOnderdelen: parts,
                activeReservations: activeRes,
                completedReservations: completedRes,
                totalItems: totalItems,
                overdueReservations: overdueRes,
                exportDate: new Date().toLocaleString('nl-NL')
            });
        }).catch(reject);
    });
}

/**
 * Haal onderdelen per categorie op
 */
async function getPartsPerCategory(db) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                category,
                COUNT(*) as part_count,
                SUM(total_quantity) as total_items
            FROM onderdelen
            GROUP BY category
            ORDER BY category
        `;
        db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Genereer Excel bestand
 */
async function generateExcelExport(db) {
    console.log('📊 Starting Excel export...');
    
    try {
        // Create exports directory if not exists
        const dbDir = path.dirname(path.join(__dirname, 'database', 'opslag.db'));
        const exportsDir = path.join(dbDir, 'exports');
        
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir, { recursive: true });
            console.log(`📁 Created exports directory: ${exportsDir}`);
        }

        // Verzamel alle data
        const [onderdelen, reservations, projects, statistics, categoryStats] = await Promise.all([
            getAllOnderdelen(db),
            getAllReservations(db),
            getAllProjects(db),
            getStatistics(db),
            getPartsPerCategory(db)
        ]);

        console.log(`✅ Data verzameld: ${onderdelen.length} onderdelen, ${reservations.length} reserveringen, ${projects.length} projecten`);

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Sheet 1: Statistieken
        const statsSheet = [
            ['Slim Opslagsysteem - Export Rapport'],
            [],
            ['Gegenereerd:', statistics.exportDate],
            [],
            ['OVERZICHT STATISTIEKEN'],
            ['Totaal Onderdelen:', statistics.totalOnderdelen],
            ['Totaal Items in Voorraad:', statistics.totalItems],
            ['Actieve Reserveringen:', statistics.activeReservations],
            ['Voltooide Reserveringen:', statistics.completedReservations],
            ['Te Late Items:', statistics.overdueReservations]
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(statsSheet), 'Statistieken');

        // Sheet 2: Onderdelen
        const ondedelenSheet = XLSX.utils.json_to_sheet(onderdelen.map(o => ({
            'Naam': o.name,
            'SKU': o.sku,
            'Beschrijving': o.description,
            'Locatie': o.location,
            'Aantal': o.total_quantity,
            'Categorie': o.category,
            'Links': o.links
        })));
        XLSX.utils.book_append_sheet(wb, ondedelenSheet, 'Onderdelen');

        // Sheet 3: Reserveringen
        const reservationsSheet = XLSX.utils.json_to_sheet(reservations.map(r => ({
            'ID': r.id,
            'Onderdeel': r.onderdeel_naam,
            'Project': r.project_naam || '-',
            'Gereserveerd Door': r.gereserveerd_door || '-',
            'Aantal': r.aantal,
            'Status': r.status,
            'Aanvraag Datum': r.aanvraag_datum,
            'Retour Datum': r.retour_datum,
            'Dagen Verlopen': r.dagen_verlopen || 0
        })));
        XLSX.utils.book_append_sheet(wb, reservationsSheet, 'Reserveringen');

        // Sheet 4: Projecten
        const projectsSheet = XLSX.utils.json_to_sheet(projects.map(p => ({
            'Naam': p.name,
            'Categorie': p.category_name || '-',
            'Reserveringen': p.reservation_count,
            'Aangemaakt': p.created_at
        })));
        XLSX.utils.book_append_sheet(wb, projectsSheet, 'Projecten');

        // Sheet 5: Categorie Overzicht
        const categorySheet = XLSX.utils.json_to_sheet(categoryStats.map(c => ({
            'Categorie': c.category,
            'Aantal Onderdelen': c.part_count,
            'Totaal Items': c.total_items || 0,
            'Minimum Vereist': c.min_required || 0
        })));
        XLSX.utils.book_append_sheet(wb, categorySheet, 'Categorieën');

        // Save file
        const filename = `SlimOpslagsysteem_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        const filepath = path.join(exportsDir, filename);

        console.log(`💾 Writing Excel file to: ${filepath}`);
        XLSX.writeFile(wb, filepath);
        
        // Verify file was created
        if (!fs.existsSync(filepath)) {
            throw new Error(`Excel bestand kon niet aangemaakt worden: ${filepath}`);
        }
        
        const filesize = fs.statSync(filepath).size;
        console.log(`✅ Excel export klaar: ${filename} (${Math.round(filesize / 1024)}KB)`);

        return {
            filename,
            filepath,
            filesize,
            sheets: 5,
            records: {
                onderdelen: onderdelen.length,
                reservations: reservations.length,
                projects: projects.length
            }
        };

    } catch (error) {
        console.error('❌ Excel export fout:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

module.exports = {
    generateExcelExport
};
