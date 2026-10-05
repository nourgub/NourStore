"""Generate the downloadable project workbooks for the Excel book (Nourix Academy).
All results are formulas; inputs are blue on light yellow. Data are fictitious."""
import os, random, datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import CellIsRule, FormulaRule, DataBarRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.chart import BarChart, PieChart, LineChart, Reference
from openpyxl.utils import get_column_letter as L

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'projets')
GREEN, DARK, GOLD, LIGHT, INPUT = '217346', '0E3B24', 'D4A84B', 'E2EFDA', 'FFF2CC'
F = lambda **k: Font(name='Arial', **k)
thin = Side(style='thin', color='BFBFBF')
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
NUM, PCT = '#,##0.00', '0.0%'
random.seed(7)


def title(ws, text, sub, width):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=width)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=width)
    c = ws.cell(1, 1, text); c.font = F(bold=True, size=16, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=DARK)
    c.alignment = Alignment(vertical='center', indent=1)
    s = ws.cell(2, 1, sub); s.font = F(italic=True, size=9, color='7F6000'); s.fill = PatternFill('solid', fgColor='FBF3DD')
    s.alignment = Alignment(indent=1)
    ws.row_dimensions[1].height = 30
    for col in range(1, width + 1):
        ws.cell(1, col).fill = PatternFill('solid', fgColor=DARK)
        ws.cell(2, col).fill = PatternFill('solid', fgColor='FBF3DD')
    ws.sheet_view.showGridLines = False


def header(ws, row, labels, col=1):
    for i, h in enumerate(labels):
        c = ws.cell(row, col + i, h)
        c.font = F(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=GREEN)
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = BOX


def cell(ws, r, c, v, fmt=None, inp=False, bold=False, fill=None, align=None):
    x = ws.cell(r, c, v); x.border = BOX
    x.font = F(color='0000FF' if inp else '000000', bold=bold)
    if inp: x.fill = PatternFill('solid', fgColor=INPUT)
    if fill: x.fill = PatternFill('solid', fgColor=fill)
    if fmt: x.number_format = fmt
    if align: x.alignment = Alignment(horizontal=align)
    return x


def widths(ws, w):
    for i, v in enumerate(w, 1): ws.column_dimensions[L(i)].width = v


def legend(ws, r, c=1):
    ws.cell(r, c, 'Légende :').font = F(bold=True, size=9)
    x = ws.cell(r, c + 1, 'Saisie (modifiable)'); x.font = F(color='0000FF', size=9); x.fill = PatternFill('solid', fgColor=INPUT)
    ws.cell(r, c + 2, 'Formule (ne pas modifier)').font = F(size=9)


# ---------------------------------------------------------------- 1. Budget
def budget():
    wb = Workbook(); ws = wb.active; ws.title = 'Budget'
    title(ws, 'Budget personnel mensuel', 'Nourix Academy · Projet 1 · Saisissez les montants en bleu ; tout le reste se calcule.', 6)
    ws['A4'] = 'Mois :'; ws['A4'].font = F(bold=True); cell(ws, 4, 2, 'Octobre 2026', inp=True)
    header(ws, 6, ['Revenus', 'Montant'])
    rev = [('Salaire', 60000), ('Travail indépendant', 12000), ('Autres revenus', 3000)]
    for i, (n, v) in enumerate(rev):
        cell(ws, 7 + i, 1, n); cell(ws, 7 + i, 2, v, NUM, inp=True)
    cell(ws, 10, 1, 'Total revenus', bold=True, fill=LIGHT); cell(ws, 10, 2, '=SUM(B7:B9)', NUM, bold=True, fill=LIGHT)
    header(ws, 12, ['Dépense', 'Prévu', 'Réel', 'Écart', '% utilisé', 'État'])
    dep = [('Loyer', 20000, 20000), ('Alimentation', 15000, 16800), ('Transport', 5000, 4200), ('Factures (eau, gaz, électricité)', 4000, 4600),
           ('Internet et téléphone', 2500, 2500), ('Santé', 3000, 1200), ('Éducation', 4000, 4000), ('Loisirs', 3000, 3900), ('Vêtements', 3000, 1500), ('Épargne', 8000, 8000)]
    r0 = 13
    for i, (n, p, rl) in enumerate(dep):
        r = r0 + i
        cell(ws, r, 1, n); cell(ws, r, 2, p, NUM, inp=True); cell(ws, r, 3, rl, NUM, inp=True)
        cell(ws, r, 4, f'=B{r}-C{r}', NUM); cell(ws, r, 5, f'=IF(B{r}=0,0,C{r}/B{r})', PCT)
        cell(ws, r, 6, f'=IF(C{r}>B{r},"Dépassement","OK")', align='center')
    rt = r0 + len(dep)
    cell(ws, rt, 1, 'Total dépenses', bold=True, fill=LIGHT)
    for c in (2, 3, 4): cell(ws, rt, c, f'=SUM({L(c)}{r0}:{L(c)}{rt-1})', NUM, bold=True, fill=LIGHT)
    cell(ws, rt, 5, f'=IF(B{rt}=0,0,C{rt}/B{rt})', PCT, bold=True, fill=LIGHT); cell(ws, rt, 6, '', fill=LIGHT)
    ws.cell(rt + 2, 1, 'Reste du mois (revenus − dépenses réelles)').font = F(bold=True)
    cell(ws, rt + 2, 3, f'=B10-C{rt}', NUM, bold=True, fill='FBF3DD')
    ws.cell(rt + 3, 1, 'Taux d’épargne').font = F(bold=True)
    cell(ws, rt + 3, 3, f'=IF(B10=0,0,(C{r0+9}+C{rt+2})/B10)', PCT, bold=True, fill='FBF3DD')
    red = PatternFill('solid', fgColor='F8CBAD')
    ws.conditional_formatting.add(f'D{r0}:D{rt-1}', CellIsRule(operator='lessThan', formula=['0'], fill=red, font=Font(color='9C0006')))
    ws.conditional_formatting.add(f'F{r0}:F{rt-1}', CellIsRule(operator='equal', formula=['"Dépassement"'], fill=red, font=Font(color='9C0006', bold=True)))
    ws.conditional_formatting.add(f'E{r0}:E{rt-1}', DataBarRule(start_type='num', start_value=0, end_type='num', end_value=1.5, color=GREEN))
    legend(ws, rt + 5)
    widths(ws, [34, 14, 14, 14, 12, 14])
    ch = BarChart(); ch.type = 'bar'; ch.title = 'Prévu et réel par dépense'; ch.style = 10; ch.height = 9; ch.width = 16
    ch.add_data(Reference(ws, min_col=2, min_row=12, max_col=3, max_row=rt - 1), titles_from_data=True)
    ch.set_categories(Reference(ws, min_col=1, min_row=r0, max_row=rt - 1))
    ws.add_chart(ch, 'H4')
    wb.calculation.fullCalcOnLoad = True; wb.save(f'{OUT}/Projet1-Budget-personnel.xlsx')


# ---------------------------------------------------------------- 2. Facture
def facture():
    wb = Workbook(); ws = wb.active; ws.title = 'Facture'; pr = wb.create_sheet('Produits')
    title(pr, 'Catalogue des produits', 'Ajoutez vos produits ici : la facture les retrouve par leur code.', 4)
    header(pr, 4, ['Code', 'Désignation', 'Prix unitaire HT', 'Unité'])
    prods = [('P001', 'Cahier 96 pages', 120, 'pièce'), ('P002', 'Stylo bleu', 30, 'pièce'), ('P003', 'Classeur A4', 250, 'pièce'), ('P004', 'Ramette papier A4', 750, 'paquet'),
             ('P005', 'Agenda 2027', 400, 'pièce'), ('P006', 'Calculatrice', 1200, 'pièce'), ('P007', 'Trousse', 350, 'pièce'), ('P008', 'Clé USB 32 Go', 900, 'pièce'),
             ('P009', 'Surligneurs (x4)', 280, 'lot'), ('P010', 'Cartable', 2500, 'pièce')]
    for i, p in enumerate(prods):
        for j, v in enumerate(p): cell(pr, 5 + i, j + 1, v, NUM if j == 2 else None, inp=True)
    widths(pr, [10, 28, 18, 10])
    title(ws, 'FACTURE', 'Nourix Academy · Projet 2 · Choisissez un code produit dans la liste et la quantité : le reste est automatique.', 6)
    info = [('Entreprise :', 'Librairie Exemple'), ('Adresse :', '12, rue Exemple, Ville'), ('Client :', 'Client Exemple'), ('N° facture :', 'F-2026-0042'), ('Date :', dt.date(2026, 10, 5))]
    for i, (k, v) in enumerate(info):
        ws.cell(4 + i, 1, k).font = F(bold=True); x = cell(ws, 4 + i, 2, v, 'dd/mm/yyyy' if isinstance(v, dt.date) else None, inp=True)
    ws.merge_cells('B4:C4'); ws.merge_cells('B5:C5'); ws.merge_cells('B6:C6')
    header(ws, 10, ['Code', 'Désignation', 'Prix unitaire HT', 'Quantité', 'Total HT', 'Unité'])
    lines = [('P001', 10), ('P002', 25), ('P004', 2), ('P006', 1), (None, None), (None, None), (None, None), (None, None)]
    for i, (c, q) in enumerate(lines):
        r = 11 + i
        cell(ws, r, 1, c, inp=True, align='center'); cell(ws, r, 4, q, inp=True, align='center')
        cell(ws, r, 2, f'=IF(A{r}="","",IFERROR(VLOOKUP(A{r},Produits!$A$5:$D$100,2,FALSE),"Code inconnu"))')
        cell(ws, r, 3, f'=IF(A{r}="","",IFERROR(VLOOKUP(A{r},Produits!$A$5:$D$100,3,FALSE),0))', NUM)
        cell(ws, r, 5, f'=IF(OR(A{r}="",D{r}=""),"",C{r}*D{r})', NUM)
        cell(ws, r, 6, f'=IF(A{r}="","",IFERROR(VLOOKUP(A{r},Produits!$A$5:$D$100,4,FALSE),""))', align='center')
    dv = DataValidation(type='list', formula1='=Produits!$A$5:$A$100', allow_blank=True); ws.add_data_validation(dv); dv.add('A11:A18')
    dq = DataValidation(type='whole', operator='greaterThan', formula1='0', allow_blank=True, error='La quantité doit être un nombre entier positif.', showErrorMessage=True)
    ws.add_data_validation(dq); dq.add('D11:D18')
    tots = [('Sous-total HT', '=SUM(E11:E18)'), ('Remise', None), ('Montant de la remise', '=E20*E21'), ('Taux de TVA', None), ('TVA', '=ROUND((E20-E22)*E23,2)'), ('TOTAL TTC', '=E20-E22+E24')]
    for i, (k, f) in enumerate(tots):
        r = 20 + i
        ws.cell(r, 4, k).font = F(bold=True); ws.cell(r, 4).alignment = Alignment(horizontal='right')
        if f: cell(ws, r, 5, f, NUM, bold=(k == 'TOTAL TTC'), fill='FBF3DD' if k == 'TOTAL TTC' else None)
    cell(ws, 21, 5, 0.05, PCT, inp=True); cell(ws, 23, 5, 0.19, PCT, inp=True)
    ws['F23'] = 'Adaptez au taux de votre pays'; ws['F23'].font = F(italic=True, size=8, color='7F7F7F')
    ws.cell(27, 1, 'Arrêtée la présente facture à la somme indiquée ci-dessus. Merci de votre confiance.').font = F(italic=True, size=9)
    legend(ws, 29)
    widths(ws, [12, 30, 16, 12, 16, 10])
    ws.print_area = 'A1:F27'; ws.page_setup.paperSize = ws.PAPERSIZE_A4; ws.page_setup.fitToWidth = 1
    wb.calculation.fullCalcOnLoad = True; wb.save(f'{OUT}/Projet2-Facture-automatique.xlsx')


# ---------------------------------------------------------------- 3. Stock
def stock():
    wb = Workbook(); a = wb.active; a.title = 'Articles'; m = wb.create_sheet('Mouvements')
    title(a, 'Gestion de stock', 'Nourix Academy · Projet 3 · Saisissez les entrées et sorties dans « Mouvements » : le stock se met à jour.', 10)
    header(a, 4, ['Code', 'Article', 'Catégorie', 'Stock initial', 'Entrées', 'Sorties', 'Stock actuel', 'Seuil d’alerte', 'Prix unitaire', 'Valeur du stock'])
    items = [('A01', 'Riz 5 kg', 'Alimentation', 40, 15, 900), ('A02', 'Huile 2 L', 'Alimentation', 60, 20, 650), ('A03', 'Sucre 1 kg', 'Alimentation', 80, 25, 110),
             ('A04', 'Café 250 g', 'Alimentation', 12, 10, 380), ('A05', 'Savon (lot de 4)', 'Hygiène', 50, 15, 320), ('A06', 'Shampooing', 'Hygiène', 30, 10, 450),
             ('A07', 'Lessive 3 kg', 'Entretien', 15, 8, 1100), ('A08', 'Eau minérale (pack)', 'Boissons', 70, 20, 240), ('A09', 'Jus 1 L', 'Boissons', 35, 15, 180), ('A10', 'Pâtes 500 g', 'Alimentation', 90, 30, 95)]
    n = len(items)
    for i, (c, nm, cat, si, se, pu) in enumerate(items):
        r = 5 + i
        cell(a, r, 1, c, inp=True, align='center'); cell(a, r, 2, nm, inp=True); cell(a, r, 3, cat, inp=True)
        cell(a, r, 4, si, '0', inp=True); cell(a, r, 8, se, '0', inp=True); cell(a, r, 9, pu, NUM, inp=True)
        cell(a, r, 5, f'=SUMIFS(Mouvements!$D:$D,Mouvements!$B:$B,A{r},Mouvements!$C:$C,"Entrée")', '0')
        cell(a, r, 6, f'=SUMIFS(Mouvements!$D:$D,Mouvements!$B:$B,A{r},Mouvements!$C:$C,"Sortie")', '0')
        cell(a, r, 7, f'=D{r}+E{r}-F{r}', '0', bold=True); cell(a, r, 10, f'=G{r}*I{r}', NUM)
    re_ = 5 + n
    cell(a, re_, 1, 'TOTAL', bold=True, fill=LIGHT)
    for c in range(2, 10): cell(a, re_, c, '', fill=LIGHT)
    cell(a, re_, 10, f'=SUM(J5:J{re_-1})', NUM, bold=True, fill=LIGHT)
    header(a, 4, ['État'], col=11)
    for i in range(n):
        r = 5 + i; cell(a, r, 11, f'=IF(G{r}<=0,"Rupture",IF(G{r}<=H{r},"À commander","OK"))', align='center')
    a.conditional_formatting.add(f'K5:K{re_-1}', CellIsRule(operator='equal', formula=['"À commander"'], fill=PatternFill('solid', fgColor='FFEB9C'), font=Font(color='9C5700', bold=True)))
    a.conditional_formatting.add(f'K5:K{re_-1}', CellIsRule(operator='equal', formula=['"Rupture"'], fill=PatternFill('solid', fgColor='F8CBAD'), font=Font(color='9C0006', bold=True)))
    a.conditional_formatting.add(f'K5:K{re_-1}', CellIsRule(operator='equal', formula=['"OK"'], fill=PatternFill('solid', fgColor='C6EFCE'), font=Font(color='006100')))
    a.cell(re_ + 2, 1, 'Articles à commander :').font = F(bold=True)
    cell(a, re_ + 2, 3, f'=COUNTIF(K5:K{re_-1},"À commander")+COUNTIF(K5:K{re_-1},"Rupture")', '0', bold=True, fill='FBF3DD')
    legend(a, re_ + 4)
    widths(a, [8, 22, 14, 12, 10, 10, 12, 13, 13, 15, 14])
    title(m, 'Mouvements de stock', 'Une ligne par mouvement. Type : Entrée ou Sortie (liste déroulante).', 5)
    header(m, 4, ['Date', 'Code', 'Type', 'Quantité', 'Article'])
    d0 = dt.date(2026, 9, 1); rows = []
    for k in range(40):
        it = random.choice(items); typ = 'Entrée' if random.random() < 0.2 else 'Sortie'
        q = random.randint(5, 15) if typ == 'Entrée' else random.randint(4, 12)
        rows.append((d0 + dt.timedelta(days=k * 3 // 4), it[0], typ, q))
    for i, (d, c, t, q) in enumerate(rows):
        r = 5 + i
        cell(m, r, 1, d, 'dd/mm/yyyy', inp=True); cell(m, r, 2, c, inp=True, align='center'); cell(m, r, 3, t, inp=True, align='center'); cell(m, r, 4, q, '0', inp=True)
        cell(m, r, 5, f'=IFERROR(VLOOKUP(B{r},Articles!$A$5:$B${re_-1},2,FALSE),"")')
    last = 5 + len(rows) + 60
    for r in range(5 + len(rows), last):
        cell(m, r, 5, f'=IF(B{r}="","",IFERROR(VLOOKUP(B{r},Articles!$A$5:$B${re_-1},2,FALSE),"Code inconnu"))')
        for c in (1, 2, 3, 4): cell(m, r, c, None, inp=True)
    dv = DataValidation(type='list', formula1='"Entrée,Sortie"'); m.add_data_validation(dv); dv.add(f'C5:C{last}')
    dc = DataValidation(type='list', formula1=f'=Articles!$A$5:$A${re_-1}'); m.add_data_validation(dc); dc.add(f'B5:B{last}')
    widths(m, [13, 9, 10, 10, 24])
    m.freeze_panes = 'A5'; a.freeze_panes = 'C5'
    ch = BarChart(); ch.title = 'Stock actuel et seuil'; ch.height = 8; ch.width = 18
    ch.add_data(Reference(a, min_col=7, min_row=4, max_row=re_ - 1), titles_from_data=True)
    ch.add_data(Reference(a, min_col=8, min_row=4, max_row=re_ - 1), titles_from_data=True)
    ch.set_categories(Reference(a, min_col=2, min_row=5, max_row=re_ - 1)); a.add_chart(ch, f'B{re_+7}')
    wb.calculation.fullCalcOnLoad = True; wb.save(f'{OUT}/Projet3-Gestion-de-stock.xlsx')


# ---------------------------------------------------------------- 4. Notes
def notes():
    wb = Workbook(); ws = wb.active; ws.title = 'Relevé'
    title(ws, 'Relevé de notes de la classe', 'Nourix Academy · Projet 4 · Saisissez les coefficients et les notes sur 20 (noms fictifs).', 11)
    mats = ['Mathématiques', 'Arabe', 'Français', 'Sciences', 'Histoire-Géo']
    ws['A4'] = 'Coefficients'; ws['A4'].font = F(bold=True)
    for j, c in enumerate([4, 3, 3, 2, 2]): cell(ws, 4, 3 + j, c, '0', inp=True, align='center')
    header(ws, 6, ['N°', 'Élève'] + mats + ['Moyenne', 'Rang', 'Mention', 'Décision'])
    names = ['Amine Exemple', 'Sara Exemple', 'Yacine Exemple', 'Lina Exemple', 'Omar Exemple', 'Nour Exemple', 'Karim Exemple', 'Meriem Exemple', 'Ilyes Exemple',
             'Rania Exemple', 'Walid Exemple', 'Yasmine Exemple', 'Sofiane Exemple', 'Imane Exemple', 'Adam Exemple', 'Malak Exemple']
    n = len(names); r1, r2 = 7, 6 + n
    for i, nm in enumerate(names):
        r = 7 + i; base = random.uniform(7, 17)
        cell(ws, r, 1, i + 1, '0', align='center'); cell(ws, r, 2, nm, inp=True)
        for j in range(5): cell(ws, r, 3 + j, round(min(20, max(2, random.gauss(base, 2.2))) * 4) / 4, '0.00', inp=True, align='center')
        cell(ws, r, 8, f'=ROUND(SUMPRODUCT(C{r}:G{r},$C$4:$G$4)/SUM($C$4:$G$4),2)', '0.00', bold=True, align='center')
        cell(ws, r, 9, f'=RANK(H{r},$H${r1}:$H${r2},0)', '0', align='center')
        cell(ws, r, 10, f'=IF(H{r}>=16,"Très bien",IF(H{r}>=14,"Bien",IF(H{r}>=12,"Assez bien",IF(H{r}>=10,"Passable",""))))', align='center')
        cell(ws, r, 11, f'=IF(H{r}>=10,"Admis","Ajourné")', align='center')
    st = r2 + 2
    for k, (lab, f) in enumerate([('Moyenne de la classe', f'=ROUND(AVERAGE(H{r1}:H{r2}),2)'), ('Meilleure moyenne', f'=MAX(H{r1}:H{r2})'), ('Plus faible moyenne', f'=MIN(H{r1}:H{r2})'),
                                  ('Nombre d’admis', f'=COUNTIF(K{r1}:K{r2},"Admis")'), ('Taux de réussite', f'=COUNTIF(K{r1}:K{r2},"Admis")/COUNTA(B{r1}:B{r2})'), ('Major de la classe', f'=INDEX(B{r1}:B{r2},MATCH(MAX(H{r1}:H{r2}),H{r1}:H{r2},0))')]):
        ws.cell(st + k, 2, lab).font = F(bold=True); cell(ws, st + k, 3, f, PCT if 'Taux' in lab else '0.00', bold=True, fill='FBF3DD')
        if 'Major' in lab or 'Nombre' in lab: ws.cell(st + k, 3).number_format = 'General'
    ws.conditional_formatting.add(f'C{r1}:G{r2}', CellIsRule(operator='lessThan', formula=['10'], font=Font(color='C00000', bold=True)))
    ws.conditional_formatting.add(f'K{r1}:K{r2}', CellIsRule(operator='equal', formula=['"Admis"'], fill=PatternFill('solid', fgColor='C6EFCE'), font=Font(color='006100', bold=True)))
    ws.conditional_formatting.add(f'K{r1}:K{r2}', CellIsRule(operator='equal', formula=['"Ajourné"'], fill=PatternFill('solid', fgColor='F8CBAD'), font=Font(color='9C0006', bold=True)))
    dv = DataValidation(type='decimal', operator='between', formula1='0', formula2='20', error='La note doit être entre 0 et 20.', showErrorMessage=True); ws.add_data_validation(dv); dv.add(f'C{r1}:G{r2}')
    legend(ws, st + 7, 2)
    widths(ws, [5, 20, 14, 10, 10, 10, 13, 10, 7, 12, 11]); ws.freeze_panes = 'C7'
    ch = BarChart(); ch.title = 'Moyenne par élève'; ch.height = 8; ch.width = 20; ch.legend = None
    ch.add_data(Reference(ws, min_col=8, min_row=6, max_row=r2), titles_from_data=True); ch.set_categories(Reference(ws, min_col=2, min_row=r1, max_row=r2))
    ws.add_chart(ch, f'E{st}')
    wb.calculation.fullCalcOnLoad = True; wb.save(f'{OUT}/Projet4-Releve-de-notes.xlsx')


# ---------------------------------------------------------------- 5. Ventes
def ventes():
    wb = Workbook(); d = wb.active; d.title = 'Données'; tb = wb.create_sheet('Tableau de bord')
    regs = ['Nord', 'Sud', 'Est', 'Ouest']; vend = ['Ali', 'Fatima', 'Hamza', 'Salma', 'Youssef', 'Asma']; prods = {'Ordinateur portable': 85000, 'Imprimante': 22000, 'Écran 24"': 28000, 'Clavier': 3500, 'Souris': 1800, 'Casque': 6500}
    header(d, 1, ['Date', 'Région', 'Vendeur', 'Produit', 'Quantité', 'Prix unitaire', 'Montant', 'Mois'])
    rows = []
    for k in range(150):
        dd = dt.date(2026, 1, 1) + dt.timedelta(days=random.randint(0, 272)); p = random.choice(list(prods))
        rows.append((dd, random.choice(regs), random.choice(vend), p, random.randint(1, 8 if prods[p] > 20000 else 25), prods[p]))
    rows.sort()
    for i, (dd, rg, v, p, q, pu) in enumerate(rows):
        r = 2 + i
        for j, val in enumerate((dd, rg, v, p, q, pu)):
            x = d.cell(r, 1 + j, val); x.font = F(color='0000FF')
        d.cell(r, 1).number_format = 'dd/mm/yyyy'; d.cell(r, 6).number_format = NUM
        d.cell(r, 7, f'=E{r}*F{r}').number_format = NUM; d.cell(r, 8, f'=MONTH(A{r})')
        for c in (7, 8): d.cell(r, c).font = F()
    last = 1 + len(rows)
    t = Table(displayName='Ventes', ref=f'A1:H{last}'); t.tableStyleInfo = TableStyleInfo(name='TableStyleMedium7', showRowStripes=True); d.add_table(t)
    widths(d, [12, 10, 11, 20, 10, 14, 15, 7]); d.freeze_panes = 'A2'
    for c in range(1, 9): d.cell(1, c).fill = PatternFill(fill_type=None); d.cell(1, c).font = F(bold=True)
    title(tb, 'Tableau de bord des ventes 2026', 'Nourix Academy · Projet 5 · Tout se calcule depuis la feuille « Données ». Choisissez une région en C4.', 9)
    tb['B4'] = 'Région :'; tb['B4'].font = F(bold=True); cell(tb, 4, 3, 'Toutes', inp=True, align='center')
    dv = DataValidation(type='list', formula1='"Toutes,Nord,Sud,Est,Ouest"'); tb.add_data_validation(dv); dv.add('C4')
    R = f"'Données'!$B$2:$B${last}"; M_ = f"'Données'!$G$2:$G${last}"; Q = f"'Données'!$E$2:$E${last}"; MO = f"'Données'!$H$2:$H${last}"; V = f"'Données'!$C$2:$C${last}"; P = f"'Données'!$D$2:$D${last}"
    reg = 'IF($C$4="Toutes","*",$C$4)'
    kp = [('Chiffre d’affaires', f'=SUMIFS({M_},{R},{reg})', NUM), ('Nombre de ventes', f'=COUNTIFS({R},{reg})', '0'), ('Quantité vendue', f'=SUMIFS({Q},{R},{reg})', '0'), ('Vente moyenne', '=IF(C7=0,0,C6/C7)', NUM)]
    for i, (k, f, fmt) in enumerate(kp):
        tb.cell(6 + i, 2, k).font = F(bold=True); cell(tb, 6 + i, 3, f, fmt, bold=True, fill='FBF3DD')
    header(tb, 11, ['Mois', 'N°', 'Chiffre d’affaires'], col=2)
    mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre']
    for i, mo in enumerate(mois):
        r = 12 + i; cell(tb, r, 2, mo); cell(tb, r, 3, i + 1, '0', align='center'); cell(tb, r, 4, f'=SUMIFS({M_},{MO},C{r},{R},{reg})', NUM)
    header(tb, 11, ['Vendeur', 'Chiffre d’affaires', 'Rang'], col=6)
    for i, v in enumerate(vend):
        r = 12 + i; cell(tb, r, 6, v); cell(tb, r, 7, f'=SUMIFS({M_},{V},F{r},{R},{reg})', NUM); cell(tb, r, 8, f'=RANK(G{r},$G$12:$G$17,0)', '0', align='center')
    tb['F19'] = 'Meilleur vendeur :'; tb['F19'].font = F(bold=True); cell(tb, 19, 7, '=INDEX(F12:F17,MATCH(MAX(G12:G17),G12:G17,0))', bold=True, fill='FBF3DD')
    header(tb, 22, ['Produit', 'Quantité', 'Chiffre d’affaires', 'Part'], col=6)
    for i, p in enumerate(prods):
        r = 23 + i; cell(tb, r, 6, p); cell(tb, r, 7, f'=SUMIFS({Q},{P},F{r},{R},{reg})', '0'); cell(tb, r, 8, f'=SUMIFS({M_},{P},F{r},{R},{reg})', NUM); cell(tb, r, 9, f'=IF($C$6=0,0,H{r}/$C$6)', PCT)
    tb.conditional_formatting.add('I23:I28', DataBarRule(start_type='num', start_value=0, end_type='num', end_value=1, color=GREEN))
    widths(tb, [2, 20, 16, 18, 3, 20, 18, 18, 10])
    c1 = LineChart(); c1.title = 'Chiffre d’affaires par mois'; c1.height = 7.5; c1.width = 15; c1.legend = None
    c1.add_data(Reference(tb, min_col=4, min_row=11, max_row=20), titles_from_data=True); c1.set_categories(Reference(tb, min_col=2, min_row=12, max_row=20)); tb.add_chart(c1, 'B31')
    c2 = PieChart(); c2.title = 'Part de chaque produit'; c2.height = 7.5; c2.width = 13
    c2.add_data(Reference(tb, min_col=8, min_row=22, max_row=28), titles_from_data=True); c2.set_categories(Reference(tb, min_col=6, min_row=23, max_row=28)); tb.add_chart(c2, 'F31')
    tb['B47'] = 'Exercice (chapitre 12) : créez un tableau croisé dynamique depuis le tableau « Ventes » de la feuille Données.'; tb['B47'].font = F(italic=True, size=9)
    wb.move_sheet('Tableau de bord', -1)
    wb.calculation.fullCalcOnLoad = True; wb.save(f'{OUT}/Projet5-Tableau-de-bord-ventes.xlsx')


# ---------------------------------------------------------------- 6. Présence et paie
def paie():
    wb = Workbook(); p = wb.active; p.title = 'Présence'; s = wb.create_sheet('Paie')
    title(p, 'Feuille de présence · Octobre 2026', 'Nourix Academy · Projet 6 · Codes : P = présent, A = absent, C = congé, M = maladie. Week-ends grisés.', 38)
    emps = [('E01', 'Employé Un', 'Vendeur', 42000), ('E02', 'Employé Deux', 'Caissière', 38000), ('E03', 'Employé Trois', 'Magasinier', 36000),
            ('E04', 'Employé Quatre', 'Comptable', 55000), ('E05', 'Employé Cinq', 'Livreur', 34000), ('E06', 'Employé Six', 'Responsable', 70000)]
    days = [dt.date(2026, 10, k) for k in range(1, 32)]
    header(p, 4, ['Code', 'Nom'] + [str(x.day) for x in days] + ['P', 'A', 'C', 'M', 'Jours ouvrés'])
    for j, x in enumerate(days):
        c = p.cell(5, 3 + j, ['L', 'M', 'M', 'J', 'V', 'S', 'D'][x.weekday()]); c.font = F(size=8, color='595959'); c.alignment = Alignment(horizontal='center')
    for i, (code, nm, _, _) in enumerate(emps):
        r = 6 + i; cell(p, r, 1, code, align='center'); cell(p, r, 2, nm)
        for j, x in enumerate(days):
            we = x.weekday() in (4, 5)  # vendredi et samedi = week-end
            v = None if we else random.choices(['P', 'A', 'C', 'M'], [90, 4, 4, 2])[0]
            cc = cell(p, r, 3 + j, v, inp=not we, align='center', fill='D9D9D9' if we else None)
        for k, code_ in enumerate('PACM'):
            cell(p, r, 34 + k, f'=COUNTIF(C{r}:AG{r},"{code_}")', '0', align='center', bold=(code_ == 'P'))
        cell(p, r, 38, f'=AH{r}+AI{r}+AJ{r}+AK{r}', '0', align='center')
    dv = DataValidation(type='list', formula1='"P,A,C,M"', allow_blank=True); p.add_data_validation(dv); dv.add(f'C6:AG{5+len(emps)}')
    p.conditional_formatting.add(f'C6:AG{5+len(emps)}', CellIsRule(operator='equal', formula=['"A"'], fill=PatternFill('solid', fgColor='F8CBAD'), font=Font(color='9C0006', bold=True)))
    p.conditional_formatting.add(f'C6:AG{5+len(emps)}', CellIsRule(operator='equal', formula=['"C"'], fill=PatternFill('solid', fgColor='DDEBF7')))
    p.cell(13, 2, 'Week-end : vendredi et samedi (modifiez selon votre pays).').font = F(italic=True, size=9)
    widths(p, [6, 18] + [3.6] * 31 + [5, 5, 5, 5, 10]); p.freeze_panes = 'C6'
    title(s, 'Calcul de la paie · Octobre 2026', 'Le salaire est proportionnel aux jours payés (présence + congés). Paramètres en bleu.', 9)
    s['B4'] = 'Jours ouvrables du mois'; s['B4'].font = F(bold=True); cell(s, 4, 4, "=COUNTA('Présence'!C6:AG6)", '0')
    s['B5'] = 'Prime par heure supplémentaire'; s['B5'].font = F(bold=True); cell(s, 5, 4, 400, NUM, inp=True)
    s['B6'] = 'Taux de cotisations sociales'; s['B6'].font = F(bold=True); cell(s, 6, 4, 0.09, PCT, inp=True)
    header(s, 8, ['Code', 'Nom', 'Poste', 'Salaire de base', 'Jours payés', 'Salaire du mois', 'Heures sup.', 'Brut', 'Cotisations', 'Net à payer'])
    for i, (code, nm, poste, base) in enumerate(emps):
        r = 9 + i; pr_ = 6 + i
        cell(s, r, 1, code, align='center'); cell(s, r, 2, f"='Présence'!B{pr_}"); cell(s, r, 3, poste, inp=True); cell(s, r, 4, base, NUM, inp=True)
        cell(s, r, 5, f"='Présence'!AH{pr_}+'Présence'!AJ{pr_}+'Présence'!AK{pr_}", '0', align='center')
        cell(s, r, 6, f'=IF($D$4=0,0,ROUND(D{r}/$D$4*E{r},2))', NUM); cell(s, r, 7, random.choice([0, 0, 2, 4, 6]), '0', inp=True, align='center')
        cell(s, r, 8, f'=F{r}+G{r}*$D$5', NUM); cell(s, r, 9, f'=ROUND(H{r}*$D$6,2)', NUM); cell(s, r, 10, f'=H{r}-I{r}', NUM, bold=True)
    rt = 9 + len(emps)
    cell(s, rt, 1, 'TOTAL', bold=True, fill=LIGHT)
    for c in (2, 3, 5, 7): cell(s, rt, c, '', fill=LIGHT)
    for c in (4, 6, 8, 9, 10): cell(s, rt, c, f'=SUM({L(c)}9:{L(c)}{rt-1})', NUM, bold=True, fill=LIGHT)
    s.cell(rt + 2, 2, 'Exemple pédagogique : les règles réelles de paie (cotisations, impôt) dépendent de la loi de votre pays.').font = F(italic=True, size=9)
    legend(s, rt + 4, 2)
    widths(s, [7, 18, 14, 15, 11, 15, 11, 15, 13, 15])
    wb.calculation.fullCalcOnLoad = True; wb.save(f'{OUT}/Projet6-Presence-et-paie.xlsx')


# ---------------------------------------------------------------- Exercices par chapitre
def exercices(cor=False):
    S = lambda f: f if cor else None
    wb = Workbook(); ws = wb.active; ws.title = 'Ch5 Formules'
    title(ws, 'Chapitre 5 · Formules et références', 'Calculez le total de chaque ligne, puis la TVA avec la référence absolue $F$3.', 6)
    ws['E3'] = 'Taux TVA :'; cell(ws, 3, 6, 0.19, PCT, inp=True)
    header(ws, 5, ['Produit', 'Prix', 'Quantité', 'Total HT', 'TVA', 'Total TTC'])
    for i, (n, pr, q) in enumerate([('Cahier', 120, 10), ('Stylo', 30, 25), ('Classeur', 250, 4), ('Agenda', 400, 3), ('Trousse', 350, 6)]):
        r = 6 + i; cell(ws, r, 1, n); cell(ws, r, 2, pr, NUM, inp=True); cell(ws, r, 3, q, '0', inp=True)
        for c, f in ((4, f'=B{r}*C{r}'), (5, f'=D{r}*$F$3'), (6, f'=D{r}+E{r}')): cell(ws, r, c, S(f), NUM, fill='F2F2F2')
    if cor: ws['A12'] = 'Solution : D6 =B6*C6 · E6 =D6*$F$3 · F6 =D6+E6, puis recopiez vers le bas.'
    ws['A12'].font = F(italic=True, size=9, color='7F7F7F')
    widths(ws, [14, 10, 10, 12, 12, 12])
    w2 = wb.create_sheet('Ch6-7 Fonctions')
    title(w2, 'Chapitres 6 et 7 · Fonctions', 'Utilisez SOMME, MOYENNE, MAX, MIN, NB.SI, SI et SOMME.SI sur ces données.', 5)
    header(w2, 4, ['Employé', 'Service', 'Ventes T1', 'Ventes T2', 'Objectif atteint ?'])
    data = [('Ali', 'Commercial', 120000, 135000), ('Fatima', 'Commercial', 98000, 87000), ('Hamza', 'Marketing', 76000, 99000), ('Salma', 'Commercial', 143000, 151000), ('Youssef', 'Marketing', 54000, 61000), ('Asma', 'Commercial', 110000, 104000)]
    for i, row in enumerate(data):
        for j, v in enumerate(row): cell(w2, 5 + i, 1 + j, v, NUM if j >= 2 else None, inp=True)
        cell(w2, 5 + i, 5, S(f'=IF(D{5+i}>=100000,"Oui","Non")'), fill='F2F2F2', align='center')
    for k, q in enumerate(['Total T1 (SOMME)', 'Moyenne T2 (MOYENNE)', 'Meilleure vente T2 (MAX)', 'Employés du service Commercial (NB.SI)', 'Ventes T1 du Marketing (SOMME.SI)', 'Objectif : « Oui » si T2 ≥ 100 000 (SI)']):
        w2.cell(12 + k, 1, q).font = F(size=10); cell(w2, 12 + k, 4, S(['=SUM(C5:C10)', '=AVERAGE(D5:D10)', '=MAX(D5:D10)', '=COUNTIF(B5:B10,"Commercial")', '=SUMIF(B5:B10,"Marketing",C5:C10)', '=COUNTIF(E5:E10,"Oui")'][k]), NUM if k < 3 or k == 4 else '0', fill='F2F2F2')
    widths(w2, [40, 14, 13, 13, 18])
    w3 = wb.create_sheet('Ch8 Recherche')
    title(w3, 'Chapitre 8 · Recherche', 'Tapez un code en B13 et retrouvez le nom et le prix avec RECHERCHEV ou INDEX/EQUIV.', 4)
    header(w3, 4, ['Code', 'Produit', 'Prix', 'Stock'])
    for i, row in enumerate([('P001', 'Cahier', 120, 80), ('P002', 'Stylo', 30, 300), ('P003', 'Classeur', 250, 45), ('P004', 'Ramette A4', 750, 20), ('P005', 'Agenda', 400, 15), ('P006', 'Calculatrice', 1200, 9)]):
        for j, v in enumerate(row): cell(w3, 5 + i, 1 + j, v, NUM if j == 2 else None, inp=True)
    w3['A13'] = 'Code cherché :'; cell(w3, 13, 2, 'P004', inp=True); w3['A14'] = 'Produit :'; cell(w3, 14, 2, S('=VLOOKUP(B13,A5:D10,2,FALSE)'), fill='F2F2F2'); w3['A15'] = 'Prix :'; cell(w3, 15, 2, S('=VLOOKUP(B13,A5:D10,3,FALSE)'), NUM, fill='F2F2F2')
    if cor: w3['A16'] = 'Variante :'; cell(w3, 16, 2, '=INDEX(B5:B10,MATCH(B13,A5:A10,0))', fill='F2F2F2')
    if cor: w3['A17'] = 'Solution : =RECHERCHEV(B13;A5:D10;2;FAUX) puis colonne 3 pour le prix.'
    w3['A17'].font = F(italic=True, size=9, color='7F7F7F')
    widths(w3, [16, 16, 10, 10])
    w4 = wb.create_sheet('Ch9 Texte et dates')
    title(w4, 'Chapitre 9 · Texte et dates', 'Nettoyez les noms (SUPPRESPACE, NOMPROPRE), séparez-les, et calculez l’âge avec DATEDIF.', 6)
    header(w4, 4, ['Nom complet (brut)', 'Nom nettoyé', 'Prénom', 'Date de naissance', 'Âge', 'Code'])
    for i, (n, d_) in enumerate([('  sami   EXEMPLE ', dt.date(1998, 3, 14)), ('lina exemple', dt.date(2001, 11, 2)), ('OMAR  exemple', dt.date(1995, 7, 23)), (' nour Exemple', dt.date(2003, 1, 30))]):
        cell(w4, 5 + i, 1, n, inp=True); cell(w4, 5 + i, 4, d_, 'dd/mm/yyyy', inp=True)
        r = 5 + i
        for c, f in ((2, f'=PROPER(TRIM(A{r}))'), (3, f'=IFERROR(LEFT(B{r},FIND(" ",B{r})-1),B{r})'), (5, f'=DATEDIF(D{r},TODAY(),"y")'), (6, f'=UPPER(LEFT(C{r},3))')): cell(w4, r, c, S(f), fill='F2F2F2')
    widths(w4, [22, 18, 12, 16, 8, 10])
    w5 = wb.create_sheet('Ch10-12 Données')
    title(w5, 'Chapitres 10 à 12 · Tableau, filtres, graphique, TCD', 'Transformez ces données en tableau (Ctrl+T), filtrez, puis créez un graphique et un tableau croisé dynamique.', 5)
    header(w5, 4, ['Date', 'Ville', 'Produit', 'Quantité', 'Montant'])
    for i in range(40):
        r = 5 + i; cell(w5, r, 1, dt.date(2026, random.randint(1, 6), random.randint(1, 28)), 'dd/mm/yyyy', inp=True)
        cell(w5, r, 2, random.choice(['Alger', 'Oran', 'Casablanca', 'Tunis', 'Rabat']), inp=True); cell(w5, r, 3, random.choice(['Thé', 'Café', 'Jus', 'Eau']), inp=True)
        q = random.randint(5, 60); cell(w5, r, 4, q, '0', inp=True); cell(w5, r, 5, q * random.choice([150, 220, 90, 60]), NUM, inp=True)
    widths(w5, [12, 12, 10, 10, 12])
    if cor:
        for w in wb.worksheets: w.cell(2, 1).value = (w.cell(2, 1).value or '') + '  ·  CORRIGÉ : les cellules grises contiennent les solutions.'
    wb.calculation.fullCalcOnLoad = True; wb.save(f'{OUT}/Exercices-CORRIGE.xlsx' if cor else f'{OUT}/Exercices-par-chapitre.xlsx')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for f in (budget, facture, stock, notes, ventes, paie): f()
    st = random.getstate(); exercices(); random.setstate(st); exercices(cor=True)
    print('ok')
