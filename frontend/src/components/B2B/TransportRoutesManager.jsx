import React, { useState, useEffect } from 'react';
import { useToast } from '../ui/Toast';
import { getCompanyRoutes, deleteCompanyRoute } from '../../services/api';
import { useCompanies } from '../../hooks/useCompanies';
import { useCompanyShifts } from '../../hooks/useCompanyShifts';
import { useRouteEditor } from '../../hooks/useRouteEditor';
import CompanyLocationModal from './CompanyLocationModal';
import ShiftFormModal from './Team/ShiftFormModal';
import RouteMap from './Routes/RouteMap';
import RouteList from './Routes/RouteList';
import RouteForm from './Routes/RouteForm';
import RoutesHeader from './Routes/RoutesHeader';
import { NoCompanyNotice, EditingBanner, ChatSyncNotice } from './Routes/RoutesNotices';

export default function TransportRoutesManager({ currentUser, selectedCompany: propCompany, onCompanyChanged }) {
  const toast = useToast();
  const {
    companies,
    selectedCompany,
    loading: loadingCompanies,
    selectCompany,
    updateCompanyLocally
  } = useCompanies(currentUser, onCompanyChanged, propCompany);

  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  const { shifts, savingShift, shiftError, saveShift, loadShifts } = useCompanyShifts(selectedCompany?.id);

  // Sincronizar con la empresa elegida desde otra pestaña del portal
  useEffect(() => {
    if (propCompany && propCompany.id !== selectedCompany?.id) selectCompany(propCompany);
  }, [propCompany?.id]);

  const loadRoutes = async (comp = selectedCompany) => {
    if (!comp?.id) return;
    try {
      setLoadingRoutes(true);
      const data = await getCompanyRoutes(comp.id);
      setRoutes(data || []);
      setActiveRoute(data && data.length > 0 ? data[0] : null);
    } catch (err) {
      console.error('Error cargando rutas:', err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  useEffect(() => {
    if (selectedCompany?.id) {
      loadRoutes(selectedCompany);
      loadShifts(selectedCompany.id);
    }
  }, [selectedCompany?.id]);

  const editor = useRouteEditor({
    company: selectedCompany,
    routes,
    shifts,
    onSaved: () => loadRoutes(selectedCompany),
    onSelectRoute: setActiveRoute,
    notify: toast
  });

  const handleSaveShift = async (form) => {
    try {
      await saveShift(null, form);
      editor.useShift(form);
      setIsShiftModalOpen(false);
      toast.success('Turno creado correctamente');
    } catch (err) {
      // El hook y el modal ya muestran el error
    }
  };

  const handleDeleteRoute = async (routeId, routeName) => {
    const confirmed = await toast.confirm(`¿Seguro que deseas eliminar la ruta "${routeName}" y todas sus paradas?`);
    if (!confirmed) return;
    try {
      await deleteCompanyRoute(selectedCompany.id, routeId);
      await loadRoutes(selectedCompany);
      toast.success('Ruta eliminada');
    } catch (err) {
      toast.error(err.message || 'Error al eliminar ruta');
    }
  };

  if (!loadingCompanies && companies.length === 0) {
    return <NoCompanyNotice />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6 animate-fadeIn">
      <RoutesHeader
        companies={companies}
        selectedCompany={selectedCompany}
        onSelectCompany={selectCompany}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        routesCount={routes.length}
        isEditing={editor.isEditing}
        onStartCreate={editor.startCreate}
        onCancelEdit={editor.cancel}
      />

      {editor.isEditing && <EditingBanner stopsCount={editor.formStops.length} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-4">
          {!editor.isEditing ? (
            <RouteList
              routes={routes}
              loading={loadingRoutes}
              activeRoute={activeRoute}
              onSelectRoute={setActiveRoute}
              onEditRoute={editor.startEdit}
              onDeleteRoute={handleDeleteRoute}
              onCreateRoute={editor.startCreate}
            />
          ) : (
            <RouteForm
              formData={editor.formData}
              stops={editor.formStops}
              shifts={shifts}
              onFormChange={editor.changeField}
              onSave={editor.save}
              onCancel={editor.cancel}
              onRemoveStop={editor.removeStop}
              onMoveStop={editor.moveStop}
              onUpdateStop={editor.updateStop}
              onOpenShiftModal={() => setIsShiftModalOpen(true)}
              saving={editor.saving}
              editingRouteId={editor.editingRouteId}
            />
          )}
          <ChatSyncNotice />
        </div>

        <div className="lg:col-span-7 space-y-3">
          <RouteMap
            isEditing={editor.isEditing}
            activeRoute={activeRoute}
            stops={editor.formStops}
            routeColor={editor.formData.color_hex}
            companyLocation={selectedCompany}
            onMapClick={editor.addStopFromMap}
          />
        </div>
      </div>

      <ShiftFormModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleSaveShift}
        savingShift={savingShift}
        shiftError={shiftError}
        selectedCompany={selectedCompany}
      />

      <CompanyLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        company={selectedCompany}
        onSaved={updateCompanyLocally}
      />
    </div>
  );
}
