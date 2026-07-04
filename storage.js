const Store = {
  sprints: JSON.parse(localStorage.getItem('kompass33_sprints') || 'null') || SEED.sprints,
  subjects: JSON.parse(localStorage.getItem('kompass33_subjects') || 'null') || SEED.subjects,
  pupils: JSON.parse(localStorage.getItem('kompass33_pupils') || 'null') || SEED.pupils,
  competencies: JSON.parse(localStorage.getItem('kompass33_competencies') || 'null') || SEED.competencies,
  records: JSON.parse(localStorage.getItem('kompass33_records') || '{}'),
  lebDrafts: JSON.parse(localStorage.getItem('kompass33_lebDrafts') || '{}'),
  metadata: JSON.parse(localStorage.getItem('kompass33_metadata') || '{}'),
  save(){
    localStorage.setItem('kompass33_sprints', JSON.stringify(this.sprints));
    localStorage.setItem('kompass33_subjects', JSON.stringify(this.subjects));
    localStorage.setItem('kompass33_pupils', JSON.stringify(this.pupils));
    localStorage.setItem('kompass33_competencies', JSON.stringify(this.competencies));
    localStorage.setItem('kompass33_records', JSON.stringify(this.records));
    localStorage.setItem('kompass33_lebDrafts', JSON.stringify(this.lebDrafts));
    localStorage.setItem('kompass33_metadata', JSON.stringify(this.metadata));
  },
  exportData(){
    return {version:'4.0', exportedAt:new Date().toISOString(), sprints:this.sprints, subjects:this.subjects, pupils:this.pupils, competencies:this.competencies, records:this.records, lebDrafts:this.lebDrafts, metadata:this.metadata};
  },
  importData(data){
    if(!data || !Array.isArray(data.pupils) || !Array.isArray(data.competencies)){ alert('Diese Datei sieht nicht wie eine KOMPASS-Datensicherung aus.'); return false; }
    this.sprints=data.sprints||this.sprints; this.subjects=data.subjects||this.subjects; this.pupils=data.pupils||[]; this.competencies=data.competencies||[]; this.records=data.records||{}; this.lebDrafts=data.lebDrafts||{}; this.metadata=data.metadata||{}; this.save(); return true;
  }
};