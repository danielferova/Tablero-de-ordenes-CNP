
import { Unit } from './types';

export const ALL_UNITS: Unit[] = [
  Unit.SuperImpresiones,
  Unit.PublicidadMovimiento,
  Unit.Publiest,
  Unit.CNPAgencia,
  Unit.Dmetal,
  Unit.PautaPuntual,
  Unit.FabricaVendedores,
  Unit.SIPaseoLasAmericas,
  Unit.Proveedores,
];

// Directory of contacts for WhatsApp notifications
export const UNIT_CONTACTS: { [key in Unit]?: string } = {
  [Unit.SuperImpresiones]: "+50212345678",
  [Unit.PublicidadMovimiento]: "+50212345678",
  [Unit.Publiest]: "+50212345678",
  [Unit.CNPAgencia]: "+50212345678",
  [Unit.Dmetal]: "+50212345678",
  [Unit.PautaPuntual]: "+50212345678",
  [Unit.FabricaVendedores]: "+50212345678",
  [Unit.SIPaseoLasAmericas]: "+50212345678",
  [Unit.Proveedores]: "+50212345678",
};
